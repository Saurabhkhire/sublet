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
router.get('/users', authRequired, async (_req, res) => {
  res.json(await all("SELECT id, email FROM users WHERE role <> 'admin' ORDER BY email"));
});

export default router;
