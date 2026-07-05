import express from 'express';
import bcrypt from 'bcryptjs';
import { get, all, run, insert } from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired, adminRequired);

// Global user accounts. Supports optional ?search= for lightweight typeahead.
router.get('/users', async (req, res) => {
  const search = (req.query.search || '').trim();
  if (search) {
    const rows = await all(
      'SELECT id, email, password_plain, linkedin, role FROM users WHERE email LIKE ? ORDER BY email LIMIT 20',
      [`%${search}%`]
    );
    return res.json(rows);
  }
  res.json(await all('SELECT id, email, password_plain, linkedin, role, created_at FROM users ORDER BY email'));
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
    password_plain: String(password),
    linkedin: linkedin || '',
    role: 'user',
    created_at: new Date().toISOString(),
  });
  res.status(201).json({ id, email, password_plain: String(password), linkedin: linkedin || '', role: 'user' });
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

// Reset a single user's password (admin only).
router.put('/users/:id', async (req, res) => {
  const target = await get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const { password } = req.body || {};
  if (!password || !String(password).trim()) {
    return res.status(400).json({ error: 'New password is required' });
  }
  const plain = String(password).trim();
  await run('UPDATE users SET password_hash = ?, password_plain = ? WHERE id = ?', [
    bcrypt.hashSync(plain, 10),
    plain,
    target.id,
  ]);
  res.json({ ok: true });
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

// Re-apply admin credentials from current environment variables.
// Useful after changing ADMIN_EMAIL / ADMIN_PASSWORD secrets without resetting the DB.
router.post('/reseed-credentials', async (_req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin123';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(adminPassword, 10);

  const existing = await get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!existing) return res.status(404).json({ error: 'No admin user found' });

  await run('UPDATE users SET email = ?, password_hash = ? WHERE id = ?', [adminEmail, hash, existing.id]);
  res.json({ ok: true, email: adminEmail });
});

export default router;
