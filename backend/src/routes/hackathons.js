import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, adminOnly, hackathonContext, optionalAuth, optionalHackathonContext } from '../middleware/auth.js';
import { ROLE_OPTIONS, SCORE_CRITERIA } from '../constants.js';

const router = express.Router();

// Public GET for a single hackathon — registered before router.use(authRequired) so it
// doesn't require a login. Unauthenticated visitors get is_admin/is_judge = false.
router.get('/:hid', optionalAuth, optionalHackathonContext, async (req, res) => {
  res.json({
    hackathon: req.hackathon,
    tracks: await all('SELECT * FROM tracks WHERE hackathon_id = ? ORDER BY id', [req.hackathonId]),
    sponsors: await all('SELECT * FROM sponsors WHERE hackathon_id = ? ORDER BY id', [req.hackathonId]),
    judges: await all(
      `SELECT u.id, u.email, u.linkedin FROM hackathon_judges hj
       JOIN users u ON u.id = hj.user_id WHERE hj.hackathon_id = ? ORDER BY u.email`,
      [req.hackathonId]
    ),
    roles: ROLE_OPTIONS.map((r) => r.value),
    score_criteria: SCORE_CRITERIA,
    is_judge: req.isJudge,
    is_admin: req.user?.role === 'admin',
  });
});

router.use(authRequired);

/* --------------------------- Hackathons --------------------------- */

// List hackathons (any authenticated user). Includes per-user judge flag + counts.
router.get('/', async (req, res) => {
  const rows = await all('SELECT * FROM hackathons ORDER BY id DESC');
  const out = [];
  for (const h of rows) {
    const pc = await get('SELECT COUNT(*) as c FROM projects WHERE hackathon_id = ?', [h.id]);
    const jc = await get('SELECT COUNT(*) as c FROM hackathon_judges WHERE hackathon_id = ?', [h.id]);
    const isJudge =
      req.user.role === 'admin' ||
      !!(await get('SELECT 1 FROM hackathon_judges WHERE hackathon_id = ? AND user_id = ?', [h.id, req.user.id]));
    out.push({ ...h, project_count: Number(pc.c), judge_count: Number(jc.c), is_judge: isJudge });
  }
  res.json(out);
});

router.post('/', adminOnly, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Hackathon name is required' });
  const id = await insert('hackathons', {
    name,
    details: req.body?.details || '',
    support_info: req.body?.support_info || '',
    schedule: req.body?.schedule || '',
    event_date: req.body?.event_date || '',
    start_time: req.body?.start_time || '',
    end_time: req.body?.end_time || '',
    location: req.body?.location || '',
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(await get('SELECT * FROM hackathons WHERE id = ?', [id]));
});

// Meta for a single hackathon (used to render forms + the public info display):
// hackathon fields + tracks + sponsors + judges + options.
router.get('/:hid', hackathonContext, async (req, res) => {
  res.json({
    hackathon: req.hackathon,
    tracks: await all('SELECT * FROM tracks WHERE hackathon_id = ? ORDER BY id', [req.hackathonId]),
    sponsors: await all('SELECT * FROM sponsors WHERE hackathon_id = ? ORDER BY id', [req.hackathonId]),
    judges: await all(
      `SELECT u.id, u.email, u.linkedin FROM hackathon_judges hj
       JOIN users u ON u.id = hj.user_id WHERE hj.hackathon_id = ? ORDER BY u.email`,
      [req.hackathonId]
    ),
    roles: ROLE_OPTIONS.map((r) => r.value),
    score_criteria: SCORE_CRITERIA,
    is_judge: req.isJudge,
    is_admin: req.user.role === 'admin',
  });
});

router.put('/:hid', hackathonContext, adminOnly, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Hackathon name is required' });
  // Merge: only overwrite fields that were explicitly included in the request body.
  // This prevents one section of the admin panel from silently wiping fields it doesn't know about.
  const cur = await get('SELECT * FROM hackathons WHERE id = ?', [req.hackathonId]);
  const b = req.body;
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  await run(
    'UPDATE hackathons SET name = ?, details = ?, support_info = ?, schedule = ?, event_date = ?, start_time = ?, end_time = ?, location = ?, voice_enabled = ?, submission_deadline = ?, submission_rules = ?, judging_rules = ?, voice_mode = ?, auto_stop_speaker = ?, auto_advance_demo = ? WHERE id = ?',
    [
      name,
      has('details')            ? (b.details            || '') : (cur.details            || ''),
      has('support_info')       ? (b.support_info        || '') : (cur.support_info        || ''),
      has('schedule')           ? (b.schedule            || '') : (cur.schedule            || ''),
      has('event_date')         ? (b.event_date          || '') : (cur.event_date          || ''),
      has('start_time')         ? (b.start_time          || '') : (cur.start_time          || ''),
      has('end_time')           ? (b.end_time            || '') : (cur.end_time            || ''),
      has('location')           ? (b.location            || '') : (cur.location            || ''),
      has('voice_mode')         ? (b.voice_mode && b.voice_mode !== 'off' ? 1 : 0) : (cur.voice_enabled ?? 0),
      has('submission_deadline')? (b.submission_deadline || '') : (cur.submission_deadline || ''),
      has('submission_rules')   ? (b.submission_rules    || '') : (cur.submission_rules    || ''),
      has('judging_rules')      ? (b.judging_rules       || '') : (cur.judging_rules       || ''),
      has('voice_mode')         ? (b.voice_mode          || 'off') : (cur.voice_mode       || 'off'),
      has('auto_stop_speaker')  ? (b.auto_stop_speaker === false ? 0 : 1) : (cur.auto_stop_speaker ?? 1),
      has('auto_advance_demo')  ? (b.auto_advance_demo  === false ? 0 : 1) : (cur.auto_advance_demo  ?? 1),
      req.hackathonId,
    ]
  );
  res.json(await get('SELECT * FROM hackathons WHERE id = ?', [req.hackathonId]));
});

// Delete all projects + judging data for this hackathon (keeps config/tracks/sponsors/judges).
router.post('/:hid/reset', hackathonContext, adminOnly, async (req, res) => {
  const projects = await all('SELECT id FROM projects WHERE hackathon_id = ?', [req.hackathonId]);
  for (const p of projects) {
    await run('DELETE FROM scores WHERE project_id = ?', [p.id]);
    await run('DELETE FROM project_tracks WHERE project_id = ?', [p.id]);
    await run('DELETE FROM project_sponsors WHERE project_id = ?', [p.id]);
  }
  await run('DELETE FROM project_participants WHERE hackathon_id = ?', [req.hackathonId]);
  await run('DELETE FROM projects WHERE hackathon_id = ?', [req.hackathonId]);
  res.json({ ok: true, deleted_projects: projects.length });
});

// Delete an entire hackathon and everything in it.
router.delete('/:hid', hackathonContext, adminOnly, async (req, res) => {
  const hid = req.hackathonId;
  const projects = await all('SELECT id FROM projects WHERE hackathon_id = ?', [hid]);
  for (const p of projects) {
    await run('DELETE FROM scores WHERE project_id = ?', [p.id]);
    await run('DELETE FROM project_tracks WHERE project_id = ?', [p.id]);
    await run('DELETE FROM project_sponsors WHERE project_id = ?', [p.id]);
  }
  await run('DELETE FROM project_participants WHERE hackathon_id = ?', [hid]);
  await run('DELETE FROM projects WHERE hackathon_id = ?', [hid]);
  await run('DELETE FROM matching_profiles WHERE hackathon_id = ?', [hid]);
  await run('DELETE FROM matching_runs WHERE hackathon_id = ?', [hid]);
  await run('DELETE FROM hackathon_judges WHERE hackathon_id = ?', [hid]);
  await run('DELETE FROM tracks WHERE hackathon_id = ?', [hid]);
  await run('DELETE FROM sponsors WHERE hackathon_id = ?', [hid]);
  await run('DELETE FROM hackathons WHERE id = ?', [hid]);
  res.json({ ok: true });
});

/* ----------------------------- Tracks ----------------------------- */
router.get('/:hid/tracks', hackathonContext, async (req, res) =>
  res.json(await all('SELECT * FROM tracks WHERE hackathon_id = ? ORDER BY id', [req.hackathonId]))
);
router.post('/:hid/tracks', hackathonContext, adminOnly, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Track name is required' });
  const description = req.body?.description || '';
  const id = await insert('tracks', { hackathon_id: req.hackathonId, name, description });
  res.status(201).json({ id, name, description });
});
router.put('/:hid/tracks/:id', hackathonContext, adminOnly, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Track name is required' });
  const description = req.body?.description || '';
  await run('UPDATE tracks SET name = ?, description = ? WHERE id = ? AND hackathon_id = ?', [name, description, req.params.id, req.hackathonId]);
  res.json({ id: Number(req.params.id), name, description });
});
router.delete('/:hid/tracks/:id', hackathonContext, adminOnly, async (req, res) => {
  await run('DELETE FROM tracks WHERE id = ? AND hackathon_id = ?', [req.params.id, req.hackathonId]);
  res.json({ ok: true });
});

/* ---------------------------- Sponsors ---------------------------- */
router.get('/:hid/sponsors', hackathonContext, async (req, res) =>
  res.json(await all('SELECT * FROM sponsors WHERE hackathon_id = ? ORDER BY id', [req.hackathonId]))
);
router.post('/:hid/sponsors', hackathonContext, adminOnly, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Sponsor name is required' });
  const data = {
    hackathon_id: req.hackathonId, name,
    description: req.body?.description || '',
    access_instructions: req.body?.access_instructions || '',
    prizes: req.body?.prizes || '',
  };
  const id = await insert('sponsors', data);
  res.status(201).json({ id, ...data });
});
router.put('/:hid/sponsors/:id', hackathonContext, adminOnly, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Sponsor name is required' });
  const description = req.body?.description || '';
  const access_instructions = req.body?.access_instructions || '';
  const prizes = req.body?.prizes || '';
  await run(
    'UPDATE sponsors SET name = ?, description = ?, access_instructions = ?, prizes = ? WHERE id = ? AND hackathon_id = ?',
    [name, description, access_instructions, prizes, req.params.id, req.hackathonId]
  );
  res.json({ id: Number(req.params.id), name, description, access_instructions, prizes });
});
router.delete('/:hid/sponsors/:id', hackathonContext, adminOnly, async (req, res) => {
  await run('DELETE FROM sponsors WHERE id = ? AND hackathon_id = ?', [req.params.id, req.hackathonId]);
  res.json({ ok: true });
});

/* --------------------- Judges (view & judge access) --------------------- */
router.get('/:hid/judges', hackathonContext, adminOnly, async (req, res) => {
  res.json(
    await all(
      `SELECT u.id, u.email, u.linkedin FROM hackathon_judges hj
       JOIN users u ON u.id = hj.user_id WHERE hj.hackathon_id = ? ORDER BY u.email`,
      [req.hackathonId]
    )
  );
});
router.post('/:hid/judges', hackathonContext, adminOnly, async (req, res) => {
  const userId = Number(req.body?.user_id);
  const user = await get('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const existing = await get('SELECT 1 FROM hackathon_judges WHERE hackathon_id = ? AND user_id = ?', [
    req.hackathonId,
    userId,
  ]);
  if (!existing) await insert('hackathon_judges', { hackathon_id: req.hackathonId, user_id: userId });
  res.status(201).json({ ok: true });
});
router.delete('/:hid/judges/:userId', hackathonContext, adminOnly, async (req, res) => {
  await run('DELETE FROM hackathon_judges WHERE hackathon_id = ? AND user_id = ?', [
    req.hackathonId,
    req.params.userId,
  ]);
  res.json({ ok: true });
});

/* --------------------- Data Exports (admin only) --------------------- */

// Users export — every participant and judge in this hackathon as CSV.
router.get('/:hid/users/export', hackathonContext, adminOnly, async (req, res) => {
  const participants = await all(
    `SELECT u.email, u.linkedin, 'Participant' AS role, p.name AS project_name
     FROM project_participants pp
     JOIN users u ON u.id = pp.user_id
     JOIN projects p ON p.id = pp.project_id
     WHERE pp.hackathon_id = ?
     ORDER BY u.email`,
    [req.hackathonId]
  );
  const judges = await all(
    `SELECT u.email, u.linkedin, 'Judge' AS role, '' AS project_name
     FROM hackathon_judges hj
     JOIN users u ON u.id = hj.user_id
     WHERE hj.hackathon_id = ?
     ORDER BY u.email`,
    [req.hackathonId]
  );
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Email', 'LinkedIn', 'Role', 'Project'];
  const rows = [...participants, ...judges].map((u) =>
    [esc(u.email), esc(u.linkedin), esc(u.role), esc(u.project_name)].join(',')
  );
  const csv = [headers.map(esc).join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
  res.send(csv);
});

// Full data export — one row per judge score with all project + score fields.
router.get('/:hid/full-export', hackathonContext, adminOnly, async (req, res) => {
  const scoreRows = await all(
    `SELECT
       p.id AS project_id, p.name AS project_name, p.short_description, p.git_link,
       p.demo_video_link, p.app_url, p.award_tag,
       u.email AS judge_email,
       s.presentation, s.execution, s.innovation, s.impact, s.implementation,
       s.total, s.investment, s.comments
     FROM scores s
     JOIN hackathon_judges hj ON hj.id = s.judge_id
     JOIN users u ON u.id = hj.user_id
     JOIN projects p ON p.id = s.project_id
     WHERE p.hackathon_id = ?
     ORDER BY p.id, u.email`,
    [req.hackathonId]
  );

  // Attach team emails + tracks + sponsors to each score row
  const teamMap = {};
  const trackMap = {};
  const sponsorMap = {};
  const participantRows = await all(
    `SELECT pp.project_id, u.email FROM project_participants pp
     JOIN users u ON u.id = pp.user_id
     JOIN projects p ON p.id = pp.project_id WHERE p.hackathon_id = ?`,
    [req.hackathonId]
  );
  for (const r of participantRows) {
    if (!teamMap[r.project_id]) teamMap[r.project_id] = [];
    teamMap[r.project_id].push(r.email);
  }
  const trackRows = await all(
    `SELECT pt.project_id, t.name FROM project_tracks pt
     JOIN tracks t ON t.id = pt.track_id
     JOIN projects p ON p.id = pt.project_id WHERE p.hackathon_id = ?`,
    [req.hackathonId]
  );
  for (const r of trackRows) {
    if (!trackMap[r.project_id]) trackMap[r.project_id] = [];
    trackMap[r.project_id].push(r.name);
  }
  const sponsorRows = await all(
    `SELECT ps.project_id, s.name FROM project_sponsors ps
     JOIN sponsors s ON s.id = ps.sponsor_id
     JOIN projects p ON p.id = ps.project_id WHERE p.hackathon_id = ?`,
    [req.hackathonId]
  );
  for (const r of sponsorRows) {
    if (!sponsorMap[r.project_id]) sponsorMap[r.project_id] = [];
    sponsorMap[r.project_id].push(r.name);
  }

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = [
    'Project','Description','Git Link','Demo Video','Live App','Team Emails',
    'Tracks','Sponsors','Awards',
    'Judge Email','Presentation','Execution','Innovation','Impact','Implementation',
    'Total Score','Investment ($)','Comments',
  ];

  const rows = scoreRows.map((s) => {
    let awards = '';
    if (s.award_tag) {
      try { const p = JSON.parse(s.award_tag); awards = Array.isArray(p) ? p.join('; ') : s.award_tag; }
      catch { awards = s.award_tag; }
    }
    return [
      esc(s.project_name), esc(s.short_description), esc(s.git_link),
      esc(s.demo_video_link), esc(s.app_url),
      esc((teamMap[s.project_id] || []).join('; ')),
      esc((trackMap[s.project_id] || []).join('; ')),
      esc((sponsorMap[s.project_id] || []).join('; ')),
      esc(awards),
      esc(s.judge_email),
      esc(s.presentation), esc(s.execution), esc(s.innovation),
      esc(s.impact), esc(s.implementation),
      esc(s.total), esc(s.investment), esc(s.comments),
    ].join(',');
  });

  const csv = [headers.map(esc).join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="full-data-export.csv"');
  res.send(csv);
});

export default router;
