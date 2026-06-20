import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, adminOnly, hackathonContext } from '../middleware/auth.js';
import { ROLE_OPTIONS, SCORE_CRITERIA } from '../constants.js';

const router = express.Router();
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
  await run(
    'UPDATE hackathons SET name = ?, details = ?, support_info = ?, schedule = ?, event_date = ?, start_time = ?, end_time = ?, location = ? WHERE id = ?',
    [
      name,
      req.body?.details || '',
      req.body?.support_info || '',
      req.body?.schedule || '',
      req.body?.event_date || '',
      req.body?.start_time || '',
      req.body?.end_time || '',
      req.body?.location || '',
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

export default router;
