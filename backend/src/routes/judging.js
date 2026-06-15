import express from 'express';
import { get, all, run } from '../db.js';
import { authRequired, judgeRequired } from '../middleware/auth.js';
import { SCORE_CRITERIA, SCORE_MAX_TOTAL } from '../constants.js';

const router = express.Router();
router.use(authRequired, judgeRequired);

router.get('/criteria', (_req, res) => {
  res.json({ criteria: SCORE_CRITERIA, max_total: SCORE_MAX_TOTAL });
});

// Submit (or update) a score for a project. Each judge has one score per project.
router.post('/:projectId/score', async (req, res) => {
  const project = await get('SELECT id FROM projects WHERE id = ?', [req.params.projectId]);
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

  // Atomic upsert keyed on the unique (project_id, judge_id). Safe if the same judge
  // submits concurrently — no read-then-write race, never a duplicate row.
  await run(
    `INSERT INTO scores
       (project_id, judge_id, presentation, technical, code_quality, functionality, innovation, ux, total, comments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (project_id, judge_id) DO UPDATE SET
       presentation = excluded.presentation,
       technical = excluded.technical,
       code_quality = excluded.code_quality,
       functionality = excluded.functionality,
       innovation = excluded.innovation,
       ux = excluded.ux,
       total = excluded.total,
       comments = excluded.comments`,
    [
      Number(req.params.projectId), req.user.id,
      values.presentation, values.technical, values.code_quality, values.functionality,
      values.innovation, values.ux, total, comments,
    ]
  );
  res.json({ ok: true, total });
});

// Scores for a project: the requesting judge's own score, plus an aggregate.
router.get('/:projectId/scores', async (req, res) => {
  const rows = await all(
    `SELECT s.*, u.email as judge_email FROM scores s JOIN users u ON u.id = s.judge_id
     WHERE s.project_id = ? ORDER BY s.id`,
    [req.params.projectId]
  );
  const mine = rows.find((r) => r.judge_id === req.user.id) || null;
  const avg = rows.length
    ? Math.round((rows.reduce((a, r) => a + r.total, 0) / rows.length) * 10) / 10
    : null;
  // Admins see every judge's score; other judges see only their own + the average.
  const visible = req.user.role === 'admin' ? rows : mine ? [mine] : [];
  res.json({ scores: visible, mine, average: avg, judge_count: rows.length });
});

export default router;
