import jwt from 'jsonwebtoken';
import { get } from '../db.js';

const SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET(), {
    expiresIn: '7d',
  });
}

// Attaches req.user (fresh from DB) when a valid Bearer token is present.
export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, SECRET());
    const user = await get(
      'SELECT id, email, linkedin, role, is_judge FROM users WHERE id = ?',
      [payload.id]
    );
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Judges are users selected by the admin (is_judge=1). Admins are always judges.
export function judgeRequired(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.is_judge !== 1)) {
    return res.status(403).json({ error: 'You are not authorised to view or judge projects' });
  }
  next();
}
