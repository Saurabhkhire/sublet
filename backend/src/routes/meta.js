import express from 'express';
import { get, all } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { ROLE_OPTIONS, SCORE_CRITERIA } from '../constants.js';

const router = express.Router();

// Public: hackathon info + tracks + sponsors + role options (for forms).
router.get('/', async (_req, res) => {
  const config = await get('SELECT hackathon_name, details FROM config WHERE id = 1');
  res.json({
    config: config || { hackathon_name: '', details: '' },
    tracks: await all('SELECT * FROM tracks ORDER BY id'),
    sponsors: await all('SELECT * FROM sponsors ORDER BY id'),
    roles: ROLE_OPTIONS.map((r) => r.value),
    score_criteria: SCORE_CRITERIA,
  });
});

// Authenticated: minimal user directory for picking project participants.
router.get('/users', authRequired, async (_req, res) => {
  res.json(await all("SELECT id, email FROM users WHERE role <> 'admin' ORDER BY email"));
});

export default router;
