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
    const user = await get('SELECT id, email, linkedin, role FROM users WHERE id = ?', [payload.id]);
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

// For nested /hackathons/:hid/* routes. Loads the hackathon and computes whether the
// caller may view/judge it (admin, or selected as a judge for THIS hackathon).
export async function hackathonContext(req, res, next) {
  const hid = Number(req.params.hid);
  if (!hid) return res.status(400).json({ error: 'Invalid hackathon id' });
  const hackathon = await get('SELECT * FROM hackathons WHERE id = ?', [hid]);
  if (!hackathon) return res.status(404).json({ error: 'Hackathon not found' });
  req.hackathon = hackathon;
  req.hackathonId = hid;
  if (req.user.role === 'admin') {
    req.isJudge = true;
  } else {
    const judge = await get(
      'SELECT 1 FROM hackathon_judges WHERE hackathon_id = ? AND user_id = ?',
      [hid, req.user.id]
    );
    req.isJudge = !!judge;
  }
  next();
}

export function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function judgeRequired(req, res, next) {
  if (!req.isJudge) {
    return res.status(403).json({ error: 'You are not authorised to view or judge projects in this hackathon' });
  }
  next();
}
