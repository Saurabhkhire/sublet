import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, judgeRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

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

// Create a submission. Each participant may belong to only ONE project.
router.post('/', async (req, res) => {
  const {
    name,
    short_description,
    demo_video_link,
    git_link,
    participants = [],
    tracks = [],
    sponsors = [],
  } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  // The creator is always a participant.
  const participantIds = Array.from(new Set([req.user.id, ...participants.map(Number)]));

  // Enforce: no participant already on another project.
  const clashes = [];
  for (const uid of participantIds) {
    const existing = await get('SELECT project_id FROM project_participants WHERE user_id = ?', [uid]);
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
    name: String(name).trim(),
    short_description: short_description || '',
    demo_video_link: demo_video_link || '',
    git_link: git_link || '',
    created_by: req.user.id,
    created_at: new Date().toISOString(),
  });

  // The pre-check above catches the common case, but two submissions sharing a
  // participant can both pass it and race to insert. The UNIQUE(user_id) constraint
  // is the real guarantee — if an insert violates it, roll back this project so no
  // orphan/partial submission is left behind, and return a clean 409.
  try {
    for (const uid of participantIds) {
      await insert('project_participants', { project_id: projectId, user_id: uid });
    }
  } catch (err) {
    await run('DELETE FROM project_participants WHERE project_id = ?', [projectId]);
    await run('DELETE FROM projects WHERE id = ?', [projectId]);
    return res.status(409).json({
      error: 'One of the selected participants was just added to another project. Please retry.',
    });
  }

  for (const tid of [...new Set(tracks.map(Number))]) {
    await run('INSERT INTO project_tracks (project_id, track_id) VALUES (?, ?)', [projectId, tid]);
  }
  for (const sid of [...new Set(sponsors.map(Number))]) {
    await run('INSERT INTO project_sponsors (project_id, sponsor_id) VALUES (?, ?)', [projectId, sid]);
  }
  res.status(201).json(await loadProjectDetail(projectId));
});

// List projects.
//  - judges/admins see every project (with optional ?sponsor=<id> filter).
//  - regular users see only projects they participate in.
router.get('/', async (req, res) => {
  const isJudge = req.user.role === 'admin' || req.user.is_judge === 1;
  let rows;
  if (isJudge) {
    const sponsorId = req.query.sponsor;
    if (sponsorId) {
      rows = await all(
        `SELECT DISTINCT p.* FROM projects p
         JOIN project_sponsors ps ON ps.project_id = p.id
         WHERE ps.sponsor_id = ? ORDER BY p.id DESC`,
        [sponsorId]
      );
    } else {
      rows = await all('SELECT * FROM projects ORDER BY id DESC');
    }
  } else {
    rows = await all(
      `SELECT p.* FROM projects p JOIN project_participants pp ON pp.project_id = p.id
       WHERE pp.user_id = ? ORDER BY p.id DESC`,
      [req.user.id]
    );
  }
  const detailed = [];
  for (const r of rows) detailed.push(await loadProjectDetail(r.id));
  res.json(detailed);
});

// Detail view: judges/admins, or a participant of the project.
router.get('/:id', async (req, res) => {
  const detail = await loadProjectDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'Project not found' });
  const isJudge = req.user.role === 'admin' || req.user.is_judge === 1;
  const isParticipant = detail.participants.some((p) => p.id === req.user.id);
  if (!isJudge && !isParticipant) {
    return res.status(403).json({ error: 'You are not allowed to view this project' });
  }
  res.json(detail);
});

export default router;
