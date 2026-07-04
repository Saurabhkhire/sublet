import express from 'express';
import nodemailer from 'nodemailer';
import { get, all, run, insert } from '../db.js';
import { authRequired, adminRequired, hackathonContext } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });
router.use(authRequired, adminRequired, hackathonContext);

async function getSmtp() {
  return await get('SELECT * FROM smtp_config ORDER BY id LIMIT 1');
}

function makeTransport(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port) || 587,
    secure: !!cfg.secure,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
}

function html(body) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;color:#1e1e1e">${body}</div>`;
}

async function getJudges(hid) {
  return all(
    `SELECT u.id, u.email, hj.judge_group FROM hackathon_judges hj
     JOIN users u ON u.id = hj.user_id WHERE hj.hackathon_id = ?`,
    [hid]
  );
}

async function getParticipants(hid) {
  return all(
    `SELECT DISTINCT u.id, u.email, p.name AS project_name, p.judge_group
     FROM project_participants pp
     JOIN users u ON u.id = pp.user_id
     JOIN projects p ON p.id = pp.project_id
     WHERE pp.hackathon_id = ?`,
    [hid]
  );
}

function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [hh, mm] = hhmm.split(':').map(Number);
  if (isNaN(hh)) return hhmm;
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
}

// Check if a specific email was already sent to a user for this hackathon+type
async function alreadySent(hid, userId, type) {
  const row = await get(
    'SELECT id FROM email_sends WHERE hackathon_id = ? AND user_id = ? AND email_type = ?',
    [hid, userId, type]
  );
  return !!row;
}

// Record that we sent this email
async function markSent(hid, userId, type) {
  try {
    await insert('email_sends', {
      hackathon_id: hid,
      user_id: userId,
      email_type: type,
      sent_at: new Date().toISOString(),
    });
  } catch (_) {
    // Unique constraint violation = already recorded — ignore
  }
}

// GET /api/hackathons/:hid/emails/recipients?type=judge_invite
router.get('/recipients', async (req, res) => {
  const type = req.query.type || '';
  const hid = req.hackathonId;
  if (['judge_invite', 'judge_schedule', 'judge_thankyou'].includes(type)) {
    const rows = await getJudges(hid);
    return res.json({ count: rows.length, emails: rows.map((r) => r.email) });
  }
  const rows = await getParticipants(hid);
  res.json({ count: rows.length, emails: rows.map((r) => r.email) });
});

// GET /api/hackathons/:hid/emails/status — how many have been sent for each type
router.get('/status', async (req, res) => {
  const hid = req.hackathonId;
  const rows = await all(
    'SELECT email_type, COUNT(*) AS cnt FROM email_sends WHERE hackathon_id = ? GROUP BY email_type',
    [hid]
  );
  const result = {};
  for (const r of rows) result[r.email_type] = Number(r.cnt);
  res.json(result);
});

// DELETE /api/hackathons/:hid/emails/:type/reset — clear sent-tracking for this type
router.delete('/:type/reset', async (req, res) => {
  const { type } = req.params;
  await run('DELETE FROM email_sends WHERE hackathon_id = ? AND email_type = ?', [req.hackathonId, type]);
  res.json({ ok: true });
});

// POST /api/hackathons/:hid/emails/:type
router.post('/:type', async (req, res) => {
  const { type } = req.params;
  const hid = req.hackathonId;
  const h = req.hackathon;

  const smtp = await getSmtp();
  if (!smtp || !smtp.host || !smtp.smtp_user) {
    return res.status(400).json({ error: 'SMTP is not configured. Please set up email in the Admin panel.' });
  }

  const transport = makeTransport(smtp);
  const fromHeader = `"${smtp.from_name || 'Hackathon'}" <${smtp.from_email || smtp.smtp_user}>`;
  const hackName = h.name || 'Hackathon';

  let sent = 0;
  let skipped = 0;
  const errors = [];

  async function send(userId, to, subject, body) {
    if (await alreadySent(hid, userId, type)) {
      skipped++;
      return;
    }
    try {
      await transport.sendMail({ from: fromHeader, to, subject, html: html(body) });
      await markSent(hid, userId, type);
      sent++;
    } catch (e) {
      errors.push(`${to}: ${e.message}`);
    }
  }

  if (type === 'judge_invite') {
    const judges = await getJudges(hid);
    if (!judges.length) return res.status(400).json({ error: 'No judges found for this hackathon.' });
    const rules = h.judging_rules || 'Please check with the organiser for judging instructions.';
    for (const j of judges) {
      await send(
        j.id, j.email,
        `You're invited to judge at ${hackName}`,
        `<h2>Welcome, Judge!</h2>
         <p>You have been invited to judge at <strong>${hackName}</strong>. We're excited to have you!</p>
         <h3>Judging Instructions</h3>
         <p style="white-space:pre-wrap">${rules}</p>
         <p>If you have any questions, please contact the organiser. See you there!</p>`
      );
    }

  } else if (type === 'participant_rules') {
    const participants = await getParticipants(hid);
    if (!participants.length) return res.status(400).json({ error: 'No participants found.' });
    const rules = h.submission_rules || 'Please check with the organiser for submission instructions.';
    for (const p of participants) {
      await send(
        p.id, p.email,
        `Submission instructions — ${hackName}`,
        `<h2>Submission Instructions</h2>
         <p>Welcome to <strong>${hackName}</strong>! Here is everything you need to know to submit your project:</p>
         <p style="white-space:pre-wrap">${rules}</p>
         <p>Good luck!</p>`
      );
    }

  } else if (type === 'participant_schedule') {
    const participants = await getParticipants(hid);
    if (!participants.length) return res.status(400).json({ error: 'No participants found.' });
    const jcfg = await get('SELECT * FROM judging_config WHERE hackathon_id = ?', [hid]);
    const startStr = h.start_time || '';
    for (const p of participants) {
      const grp = p.judge_group || 'TBD';
      let schedLine = '';
      if (jcfg && p.judge_group && startStr) {
        const [sh, sm] = startStr.split(':').map(Number);
        const groupIdx = p.judge_group.charCodeAt(0) - 65;
        const startMins = sh * 60 + sm + groupIdx * jcfg.judge_time_minutes;
        const endMins = startMins + jcfg.judge_time_minutes;
        const fmt = (m) => fmtTime(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
        schedLine = `<p><strong>Your demo time slot:</strong> ${fmt(startMins)} – ${fmt(endMins)}</p>`;
      }
      await send(
        p.id, p.email,
        `Your schedule — ${hackName}`,
        `<h2>Your Demo Day Schedule</h2>
         <p>Hello! Here is your schedule for <strong>${hackName}</strong>.</p>
         <p><strong>Project:</strong> ${p.project_name}</p>
         <p><strong>Demo Group:</strong> ${grp}</p>
         ${schedLine}
         <p>Please make sure your project is submitted and ready before your time slot!</p>`
      );
    }

  } else if (type === 'judge_schedule') {
    const judges = await getJudges(hid);
    if (!judges.length) return res.status(400).json({ error: 'No judges found.' });
    const jcfg = await get('SELECT * FROM judging_config WHERE hackathon_id = ?', [hid]);
    const startStr = h.start_time || '';
    for (const j of judges) {
      const grp = j.judge_group || 'TBD';
      let projects = [];
      let timeLine = '';
      if (grp !== 'TBD') {
        projects = await all(
          'SELECT name FROM projects WHERE hackathon_id = ? AND judge_group = ? ORDER BY id',
          [hid, grp]
        );
        if (jcfg && startStr) {
          const [sh, sm] = startStr.split(':').map(Number);
          const groupIdx = grp.charCodeAt(0) - 65;
          const startMins = sh * 60 + sm + groupIdx * jcfg.judge_time_minutes;
          const endMins = startMins + jcfg.judge_time_minutes;
          const fmt = (m) => fmtTime(`${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
          timeLine = `<p><strong>Your judging time slot:</strong> ${fmt(startMins)} – ${fmt(endMins)}</p>`;
        }
      }
      const projList = projects.length
        ? `<ul>${projects.map((p) => `<li>${p.name}</li>`).join('')}</ul>`
        : '<p>Project assignments not yet confirmed.</p>';
      await send(
        j.id, j.email,
        `Your judging schedule — ${hackName}`,
        `<h2>Judging Schedule</h2>
         <p>Hello! Here is your judging schedule for <strong>${hackName}</strong>.</p>
         <p><strong>Your Group:</strong> ${grp}</p>
         ${timeLine}
         <h3>Projects to Judge</h3>${projList}
         <p>Thank you for being a judge!</p>`
      );
    }

  } else if (type === 'judge_thankyou') {
    const judges = await getJudges(hid);
    if (!judges.length) return res.status(400).json({ error: 'No judges found.' });
    for (const j of judges) {
      await send(
        j.id, j.email,
        `Thank you for judging at ${hackName}!`,
        `<h2>Thank You!</h2>
         <p>Dear Judge,</p>
         <p>Thank you so much for taking the time to judge at <strong>${hackName}</strong>. Your effort and feedback are invaluable to the participants.</p>
         <p>We truly appreciate your participation and hope to see you at future events!</p>
         <p>Warm regards,<br/>The ${hackName} Team</p>`
      );
    }

  } else if (type === 'participant_reminder') {
    const participants = await getParticipants(hid);
    if (!participants.length) return res.status(400).json({ error: 'No participants found.' });
    const deadlineStr = h.submission_deadline ? ` before ${fmtTime(h.submission_deadline)}` : '';
    for (const p of participants) {
      await send(
        p.id, p.email,
        `Reminder: Submit your project — ${hackName}`,
        `<h2>Don't Forget to Submit!</h2>
         <p>Hi there,</p>
         <p>This is a friendly reminder to submit your project for <strong>${hackName}</strong>${deadlineStr}.</p>
         <p>Make sure your project is fully filled out — description, team members, tracks, and demo video link (if any).</p>
         <p>Good luck — we're excited to see what you've built!</p>`
      );
    }

  } else if (type === 'deadline_reminder') {
    const participants = await getParticipants(hid);
    if (!participants.length) return res.status(400).json({ error: 'No participants found.' });
    const deadlineStr = h.submission_deadline ? `${fmtTime(h.submission_deadline)}` : 'soon';
    for (const p of participants) {
      await send(
        p.id, p.email,
        `⚠️ URGENT: Submit now — ${hackName}`,
        `<h2 style="color:#dc2626">⚠️ Submission Deadline Approaching!</h2>
         <p>Hi there,</p>
         <p>The submission deadline for <strong>${hackName}</strong> is <strong>${deadlineStr}</strong>. You have a 30-minute grace period after the deadline.</p>
         <p><strong>Submit your project now</strong> to be included in the judging assignments!</p>
         <p>Late submissions may not receive a judging group. Don't miss out!</p>`
      );
    }

  } else {
    return res.status(400).json({ error: `Unknown email type: ${type}` });
  }

  res.json({ sent, skipped, errors: errors.length ? errors : undefined });
});

export default router;
