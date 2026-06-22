import express from 'express';
import { all } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { ROLE_OPTIONS, SCORE_CRITERIA } from '../constants.js';

const router = express.Router();

// Public: global constants (role options + score criteria).
router.get('/', (_req, res) => {
  res.json({
    roles: ROLE_OPTIONS.map((r) => r.value),
    score_criteria: SCORE_CRITERIA,
  });
});

// Authenticated: minimal user directory for picking participants / judges.
// Supports optional ?search=<query> for typeahead (≤ 20 results, email contains match).
router.get('/users', authRequired, async (req, res) => {
  const search = (req.query.search || '').trim();
  if (search) {
    const rows = await all(
      "SELECT id, email FROM users WHERE role <> 'admin' AND email LIKE ? ORDER BY email LIMIT 20",
      [`%${search}%`]
    );
    return res.json(rows);
  }
  res.json(await all("SELECT id, email FROM users WHERE role <> 'admin' ORDER BY email"));
});

export default router;
