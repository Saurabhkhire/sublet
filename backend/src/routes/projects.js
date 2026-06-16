import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, hackathonContext, judgeRequired } from '../middleware/auth.js';
import { SCORE_CRITERIA } from '../constants.js';

// Mounted at /api/hackathons/:hid/projects
const router = express.Router({ mergeParams: true });
router.use(authRequired, hackathonContext);

async function loadProjectDetail(projectId) {
  const project = await get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) return null;
  const participants = await all(
    `SELECT u.id, u.email, u.linkedin FROM project_participants pp
     JOIN users u ON u.id = pp.user_id WHERE pp.project_id = ?`,
    [projectId]
  );
  const tracks = await all(
    `SELECT t.id, t.name FROM project_tracks pt JOIN tracks t ON t.id = pt.track_id WHERE pt.project_id = ?`,
    [projectId]
  );
  const sponsors = await all(
    `SELECT s.id, s.name FROM project_sponsors ps JOIN sponsors s ON s.id = ps.sponsor_id WHERE ps.project_id = ?`,
    [projectId]
  );
  return { ...project, participants, tracks, sponsors };
}

// Create a submission. Each participant may be on only ONE project per hackathon.
router.post('/', async (req, res) => {
  const { name, short_description, demo_video_link, git_link, participants = [], tracks = [], sponsors = [] } =
    req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  const participantIds = Array.from(new Set([req.user.id, ...participants.map(Number)]));

  // Pre-check: nobody already on another project in this hackathon.
  const clashes = [];
  for (const uid of participantIds) {
    const existing = await get(
      'SELECT project_id FROM project_participants WHERE hackathon_id = ? AND user_id = ?',
      [req.hackathonId, uid]
    );
    if (existing) {
      const u = await get('SELECT email FROM users WHERE id = ?', [uid]);
      clashes.push(u ? u.email : `user ${uid}`);
    }
  }
  if (clashes.length > 0) {
    return res.status(409).json({
      error: `These participants are already part of another project: ${clashes.join(', ')}`,
    });
  }

  const projectId = await insert('projects', {
    hackathon_id: req.hackathonId,
    name: String(name).trim(),
    short_description: short_description || '',
    demo_video_link: demo_video_link || '',
    git_link: git_link || '',
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  });

  // UNIQUE(hackathon_id, user_id) is the real guard against a concurrent race.
  try {
    for (const uid of participantIds) {
      await insert('project_participants', { hackathon_id: req.hackathonId, project_id: projectId, user_id: uid });
    }
  } catch {
    await run('DELETE FROM project_participants WHERE project_id = ?', [projectId]);
    await run('DELETE FROM projects WHERE id = ?', [projectId]);
    return res.status(409).json({
      error: 'One of the selected participants was just added to another project. Please retry.',
    });
  }

  const validTracks = (await all('SELECT id FROM tracks WHERE hackathon_id = ?', [req.hackathonId])).map((t) => t.id);
  const validSponsors = (await all('SELECT id FROM sponsors WHERE hackathon_id = ?', [req.hackathonId])).map((s) => s.id);
  for (const tid of [...new Set(tracks.map(Number))]) {
    if (validTracks.includes(tid)) await run('INSERT INTO project_tracks (project_id, track_id) VALUES (?, ?)', [projectId, tid]);
  }
  for (const sid of [...new Set(sponsors.map(Number))]) {
    if (validSponsors.includes(sid)) await run('INSERT INTO project_sponsors (project_id, sponsor_id) VALUES (?, ?)', [projectId, sid]);
  }
  res.status(201).json(await loadProjectDetail(projectId));
});

// List: judges/admins see all (optional ?sponsor= filter); others see only their own.
router.get('/', async (req, res) => {
  let rows;
  if (req.isJudge) {
    const sponsorId = req.query.sponsor;
    if (sponsorId) {
      rows = await all(
        `SELECT DISTINCT p.* FROM projects p JOIN project_sponsors ps ON ps.project_id = p.id
         WHERE p.hackathon_id = ? AND ps.sponsor_id = ? ORDER BY p.id DESC`,
        [req.hackathonId, sponsorId]
      );
    } else {
      rows = await all('SELECT * FROM projects WHERE hackathon_id = ? ORDER BY id DESC', [req.hackathonId]);
    }
  } else {
    rows = await all(
      `SELECT p.* FROM projects p JOIN project_participants pp ON pp.project_id = p.id
       WHERE p.hackathon_id = ? AND pp.user_id = ? ORDER BY p.id DESC`,
      [req.hackathonId, req.user.id]
    );
  }
  const detailed = [];
  for (const r of rows) detailed.push(await loadProjectDetail(r.id));
  res.json(detailed);
});

router.get('/:projectId', async (req, res) => {
  const detail = await loadProjectDetail(req.params.projectId);
  if (!detail || detail.hackathon_id !== req.hackathonId) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const isParticipant = detail.participants.some((p) => p.id === req.user.id);
  if (!req.isJudge && !isParticipant) {
    return res.status(403).json({ error: 'You are not allowed to view this project' });
  }
  res.json(detail);
});

/* ----------------------------- Judging ----------------------------- */

// Submit/update the caller-judge's score (atomic upsert).
router.post('/:projectId/score', judgeRequired, async (req, res) => {
  const project = await get('SELECT id FROM projects WHERE id = ? AND hackathon_id = ?', [
    req.params.projectId,
    req.hackathonId,
  ]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const body = req.body || {};
  const values = {};
  let total = 0;
  for (const c of SCORE_CRITERIA) {
    const v = Number(body[c.key]);
    if (Number.isNaN(v) || v < 0 || v > c.max) {
      return res.status(400).json({ error: `${c.label} must be between 0 and ${c.max}` });
    }
    values[c.key] = v;
    total += v;
  }
  const comments = body.comments || '';

  await run(
    `INSERT INTO scores
       (project_id, judge_id, presentation, technical, code_quality, functionality, innovation, ux, total, comments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (project_id, judge_id) DO UPDATE SET
       presentation = excluded.presentation, technical = excluded.technical,
       code_quality = excluded.code_quality, functionality = excluded.functionality,
       innovation = excluded.innovation, ux = excluded.ux,
       total = excluded.total, comments = excluded.comments`,
    [
      Number(req.params.projectId), req.user.id,
      values.presentation, values.technical, values.code_quality, values.functionality,
      values.innovation, values.ux, total, comments,
    ]
  );
  res.json({ ok: true, total });
});

router.get('/:projectId/scores', judgeRequired, async (req, res) => {
  const rows = await all(
    `SELECT s.*, u.email as judge_email FROM scores s JOIN users u ON u.id = s.judge_id
     WHERE s.project_id = ? ORDER BY s.id`,
    [req.params.projectId]
  );
  const mine = rows.find((r) => r.judge_id === req.user.id) || null;
  const avg = rows.length ? Math.round((rows.reduce((a, r) => a + r.total, 0) / rows.length) * 10) / 10 : null;
  const visible = req.user.role === 'admin' ? rows : mine ? [mine] : [];
  res.json({ scores: visible, mine, average: avg, judge_count: rows.length });
});

export default router;
