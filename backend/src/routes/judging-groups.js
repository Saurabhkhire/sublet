import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, hackathonContext, adminOnly } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });
router.use(authRequired, hackathonContext);

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function labelForIndex(i) { return LABELS[i] || `G${i + 1}`; }

// ── GET / — config + full group map
router.get('/', async (req, res) => {
  const config = await get('SELECT * FROM judging_config WHERE hackathon_id = ?', [req.hackathonId])
    || { judge_time_minutes: 60, per_project_minutes: 5, group_count: 0, assigned_at: '' };

  const projects = await all(
    'SELECT id, name, judge_group, award_tag FROM projects WHERE hackathon_id = ? ORDER BY id',
    [req.hackathonId]
  );
  // Attach team emails (separate query avoids GROUP_CONCAT / STRING_AGG dialect differences)
  for (const p of projects) {
    const members = await all(
      'SELECT u.email FROM project_participants pp JOIN users u ON u.id = pp.user_id WHERE pp.project_id = ?',
      [p.id]
    );
    p.team_emails = members.map((m) => m.email).join(',');
  }

  const judges = await all(
    `SELECT hj.user_id, hj.judge_group, hj.attended_at, u.email, u.name
     FROM hackathon_judges hj
     JOIN users u ON u.id = hj.user_id
     WHERE hj.hackathon_id = ? ORDER BY hj.attended_at`,
    [req.hackathonId]
  );

  const projects_per_group = config.per_project_minutes > 0
    ? Math.floor(config.judge_time_minutes / config.per_project_minutes) : 0;

  const group_count_needed = projects_per_group > 0
    ? Math.ceil(projects.length / projects_per_group) : 0;

  const groups = {};
  for (const p of projects) {
    if (p.judge_group) {
      if (!groups[p.judge_group]) groups[p.judge_group] = { projects: [], judges: [] };
      groups[p.judge_group].projects.push(p);
    }
  }
  for (const j of judges) {
    if (j.judge_group) {
      if (!groups[j.judge_group]) groups[j.judge_group] = { projects: [], judges: [] };
      groups[j.judge_group].judges.push({ user_id: j.user_id, email: j.email, attended_at: j.attended_at });
    }
  }

  const myJudge = judges.find((j) => j.user_id === req.user.id);

  // Participant's project group
  const myProject = projects.find((p) =>
    (p.team_emails || '').split(',').includes(req.user.email)
  );

  res.json({
    config,
    projects_per_group,
    group_count_needed,
    groups,
    all_judges: judges.map((j) => ({ user_id: j.user_id, email: j.email, name: j.name || '', judge_group: j.judge_group, attended_at: j.attended_at })),
    unassigned_projects: projects.filter((p) => !p.judge_group).length,
    my_judge_group: myJudge?.judge_group || null,
    my_judge_attended: !!myJudge?.attended_at,
    my_project: myProject ? { id: myProject.id, name: myProject.name, judge_group: myProject.judge_group } : null,
  });
});

// ── PUT /config — save params (admin)
router.put('/config', adminOnly, async (req, res) => {
  const jt = Math.max(1, Number(req.body?.judge_time_minutes) || 60);
  const pp = Math.max(1, Number(req.body?.per_project_minutes) || 5);
  const existing = await get('SELECT id FROM judging_config WHERE hackathon_id = ?', [req.hackathonId]);
  if (existing) {
    await run('UPDATE judging_config SET judge_time_minutes = ?, per_project_minutes = ? WHERE hackathon_id = ?',
      [jt, pp, req.hackathonId]);
  } else {
    await insert('judging_config', {
      hackathon_id: req.hackathonId,
      judge_time_minutes: jt,
      per_project_minutes: pp,
      group_count: 0,
      assigned_at: '',
    });
  }
  res.json({ ok: true });
});

// ── POST /assign — round-robin all projects into groups (admin)
router.post('/assign', adminOnly, async (req, res) => {
  const config = await get('SELECT * FROM judging_config WHERE hackathon_id = ?', [req.hackathonId]);
  if (!config) return res.status(400).json({ error: 'Save judging params first' });

  const ppg = Math.floor(config.judge_time_minutes / config.per_project_minutes);
  if (ppg < 1) return res.status(400).json({ error: 'Projects per group < 1 — adjust params' });

  const projects = await all('SELECT id FROM projects WHERE hackathon_id = ? ORDER BY id', [req.hackathonId]);
  const gc = Math.max(1, Math.ceil(projects.length / ppg));

  for (let i = 0; i < projects.length; i++) {
    await run('UPDATE projects SET judge_group = ? WHERE id = ?', [labelForIndex(i % gc), projects[i].id]);
  }
  await run('UPDATE judging_config SET group_count = ?, assigned_at = ? WHERE hackathon_id = ?',
    [gc, new Date().toISOString(), req.hackathonId]);

  res.json({ ok: true, group_count: gc, projects_assigned: projects.length });
});

// ── POST /attend — judge marks attendance, gets assigned a group
router.post('/attend', async (req, res) => {
  const judge = await get(
    'SELECT * FROM hackathon_judges WHERE hackathon_id = ? AND user_id = ?',
    [req.hackathonId, req.user.id]
  );
  if (!judge) return res.status(403).json({ error: 'You are not a judge for this hackathon' });
  if (judge.judge_group) return res.json({ group: judge.judge_group, already: true });

  const config = await get('SELECT * FROM judging_config WHERE hackathon_id = ?', [req.hackathonId]);
  if (!config || config.group_count < 1) return res.status(400).json({ error: 'Groups have not been assigned yet' });

  const attended = await all(
    "SELECT judge_group FROM hackathon_judges WHERE hackathon_id = ? AND judge_group != '' ORDER BY attended_at",
    [req.hackathonId]
  );
  const group = labelForIndex(attended.length % config.group_count);

  await run('UPDATE hackathon_judges SET judge_group = ?, attended_at = ? WHERE hackathon_id = ? AND user_id = ?',
    [group, new Date().toISOString(), req.hackathonId, req.user.id]);

  res.json({ ok: true, group });
});

// ── POST /attend/:userId — admin marks attendance on behalf of a judge
router.post('/attend/:userId', adminOnly, async (req, res) => {
  const uid = Number(req.params.userId);
  const judge = await get('SELECT * FROM hackathon_judges WHERE hackathon_id = ? AND user_id = ?', [req.hackathonId, uid]);
  if (!judge) return res.status(404).json({ error: 'Judge not found' });
  if (judge.judge_group) return res.json({ group: judge.judge_group, already: true });

  const config = await get('SELECT * FROM judging_config WHERE hackathon_id = ?', [req.hackathonId]);
  if (!config || config.group_count < 1) return res.status(400).json({ error: 'Groups have not been assigned yet' });

  const attended = await all(
    "SELECT judge_group FROM hackathon_judges WHERE hackathon_id = ? AND judge_group != '' ORDER BY attended_at",
    [req.hackathonId]
  );
  const group = labelForIndex(attended.length % config.group_count);
  await run('UPDATE hackathon_judges SET judge_group = ?, attended_at = ? WHERE hackathon_id = ? AND user_id = ?',
    [group, new Date().toISOString(), req.hackathonId, uid]);

  res.json({ ok: true, group });
});

// ── DELETE /attend/:userId — admin clears a judge's attendance (re-assign)
router.delete('/attend/:userId', adminOnly, async (req, res) => {
  await run("UPDATE hackathon_judges SET judge_group = '', attended_at = '' WHERE hackathon_id = ? AND user_id = ?",
    [req.hackathonId, Number(req.params.userId)]);
  res.json({ ok: true });
});

export default router;
