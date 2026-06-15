import express from 'express';
import bcrypt from 'bcryptjs';
import { get, all, run, insert } from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired, adminRequired);

/* ----------------------------- Config ----------------------------- */
router.get('/config', async (_req, res) => {
  const cfg = await get('SELECT * FROM config WHERE id = 1');
  res.json(cfg || { hackathon_name: '', details: '' });
});

router.put('/config', async (req, res) => {
  const { hackathon_name, details } = req.body || {};
  await run('UPDATE config SET hackathon_name = ?, details = ? WHERE id = 1', [
    hackathon_name ?? '',
    details ?? '',
  ]);
  res.json(await get('SELECT * FROM config WHERE id = 1'));
});

/* ----------------------------- Tracks ----------------------------- */
router.get('/tracks', async (_req, res) => res.json(await all('SELECT * FROM tracks ORDER BY id')));

router.post('/tracks', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Track name is required' });
  const id = await insert('tracks', { name });
  res.status(201).json({ id, name });
});

router.put('/tracks/:id', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Track name is required' });
  await run('UPDATE tracks SET name = ? WHERE id = ?', [name, req.params.id]);
  res.json({ id: Number(req.params.id), name });
});

router.delete('/tracks/:id', async (req, res) => {
  await run('DELETE FROM tracks WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

/* ---------------------------- Sponsors ---------------------------- */
router.get('/sponsors', async (_req, res) =>
  res.json(await all('SELECT * FROM sponsors ORDER BY id'))
);

router.post('/sponsors', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Sponsor name is required' });
  const id = await insert('sponsors', { name });
  res.status(201).json({ id, name });
});

router.put('/sponsors/:id', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Sponsor name is required' });
  await run('UPDATE sponsors SET name = ? WHERE id = ?', [name, req.params.id]);
  res.json({ id: Number(req.params.id), name });
});

router.delete('/sponsors/:id', async (req, res) => {
  await run('DELETE FROM sponsors WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

/* --------------------------- User mgmt ---------------------------- */
router.get('/users', async (_req, res) => {
  res.json(
    await all('SELECT id, email, linkedin, role, is_judge, created_at FROM users ORDER BY id')
  );
});

router.post('/users', async (req, res) => {
  const { email, password, linkedin, is_judge } = req.body || {};
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
    is_judge: is_judge ? 1 : 0,
    created_at: new Date().toISOString(),
  });
  res.status(201).json({ id, email, linkedin: linkedin || '', role: 'user', is_judge: is_judge ? 1 : 0 });
});

// Grant / revoke the "can view + judge projects" permission.
router.patch('/users/:id', async (req, res) => {
  const { is_judge } = req.body || {};
  const target = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  await run('UPDATE users SET is_judge = ? WHERE id = ?', [is_judge ? 1 : 0, req.params.id]);
  res.json({ id: Number(req.params.id), is_judge: is_judge ? 1 : 0 });
});

router.delete('/users/:id', async (req, res) => {
  const target = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(400).json({ error: 'The admin account cannot be removed' });
  }
  // Clean up related rows so constraints stay consistent.
  await run('DELETE FROM project_participants WHERE user_id = ?', [req.params.id]);
  await run('DELETE FROM matching_profiles WHERE user_id = ?', [req.params.id]);
  await run('DELETE FROM scores WHERE judge_id = ?', [req.params.id]);
  await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
