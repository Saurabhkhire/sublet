import express from 'express';
import bcrypt from 'bcryptjs';
import { get, insert, run } from '../db.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  const { email, password, linkedin } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!linkedin || !String(linkedin).trim()) {
    return res.status(400).json({ error: 'LinkedIn URL is required' });
  }
  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  const linkedinUrl = String(linkedin).trim();
  const hash = bcrypt.hashSync(String(password), 10);
  const id = await insert('users', {
    email,
    password_hash: hash,
    linkedin: linkedinUrl,
    role: 'user',
    created_at: new Date().toISOString(),
  });
  const user = { id, email, role: 'user' };
  return res.status(201).json({ token: signToken(user), user: { ...user, linkedin: linkedinUrl } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  return res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, role: user.role, linkedin: user.linkedin },
  });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

// Any logged-in user can update their own LinkedIn URL and/or password.
router.put('/profile', authRequired, async (req, res) => {
  const { linkedin, password } = req.body || {};
  const updates = {};
  if (linkedin !== undefined) {
    if (!String(linkedin).trim()) return res.status(400).json({ error: 'LinkedIn URL is required' });
    updates.linkedin = String(linkedin).trim();
  }
  if (password !== undefined && password !== '') {
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    updates.password_hash = bcrypt.hashSync(String(password), 10);
  }
  const keys = Object.keys(updates);
  if (keys.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const setSql = keys.map((k) => `${k} = ?`).join(', ');
  await run(`UPDATE users SET ${setSql} WHERE id = ?`, [...keys.map((k) => updates[k]), req.user.id]);
  const user = await get('SELECT id, email, linkedin, role FROM users WHERE id = ?', [req.user.id]);
  res.json({ user });
});

export default router;
