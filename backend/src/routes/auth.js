import express from 'express';
import bcrypt from 'bcryptjs';
import { get, insert } from '../db.js';
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
  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const id = await insert('users', {
    email,
    password_hash: hash,
    linkedin: linkedin || '',
    role: 'user',
    is_judge: 0,
    created_at: new Date().toISOString(),
  });
  const user = { id, email, role: 'user' };
  return res.status(201).json({ token: signToken(user), user: { ...user, is_judge: 0, linkedin: linkedin || '' } });
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
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_judge: user.is_judge,
      linkedin: user.linkedin,
    },
  });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

export default router;
