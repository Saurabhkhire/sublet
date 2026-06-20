import express from 'express';
import bcrypt from 'bcryptjs';
import { get, all, run, insert } from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired, adminRequired);

// Global user accounts. Per-hackathon judge access is managed under /hackathons/:hid/judges.
router.get('/users', async (_req, res) => {
  res.json(await all('SELECT id, email, linkedin, role, created_at FROM users ORDER BY id'));
});

router.post('/users', async (req, res) => {
  const { email, password, linkedin } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const id = await insert('users', {
    email,
    password_hash: bcrypt.hashSync(String(password), 10),
    linkedin: linkedin || '',
    role: 'user',
    created_at: new Date().toISOString(),
  });
  res.status(201).json({ id, email, linkedin: linkedin || '', role: 'user' });
});

// Delete ALL non-admin users at once (and their related data). Any project left with no
// remaining participants is removed too, so this also clears demo/seeded projects.
router.delete('/users', async (_req, res) => {
  const users = await all("SELECT id FROM users WHERE role <> 'admin'");
  for (const u of users) {
    await run('DELETE FROM project_participants WHERE user_id = ?', [u.id]);
    await run('DELETE FROM matching_profiles WHERE user_id = ?', [u.id]);
    await run('DELETE FROM hackathon_judges WHERE user_id = ?', [u.id]);
    await run('DELETE FROM scores WHERE judge_id = ?', [u.id]);
    await run('DELETE FROM users WHERE id = ?', [u.id]);
  }
  // Clean up projects that now have no participants.
  const orphans = await all('SELECT id FROM projects WHERE id NOT IN (SELECT project_id FROM project_participants)');
  for (const p of orphans) {
    await run('DELETE FROM scores WHERE project_id = ?', [p.id]);
    await run('DELETE FROM project_tracks WHERE project_id = ?', [p.id]);
    await run('DELETE FROM project_sponsors WHERE project_id = ?', [p.id]);
    await run('DELETE FROM projects WHERE id = ?', [p.id]);
  }
  res.json({ ok: true, deleted_users: users.length, deleted_projects: orphans.length });
});

router.delete('/users/:id', async (req, res) => {
  const target = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(400).json({ error: 'The admin account cannot be removed' });
  }
  await run('DELETE FROM project_participants WHERE user_id = ?', [req.params.id]);
  await run('DELETE FROM matching_profiles WHERE user_id = ?', [req.params.id]);
  await run('DELETE FROM hackathon_judges WHERE user_id = ?', [req.params.id]);
  await run('DELETE FROM scores WHERE judge_id = ?', [req.params.id]);
  await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
