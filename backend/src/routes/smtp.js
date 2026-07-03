import express from 'express';
import { get, run, insert, all } from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired, adminRequired);

async function getConfig() {
  return await get('SELECT * FROM smtp_config ORDER BY id LIMIT 1');
}

router.get('/', async (_req, res) => {
  const cfg = await getConfig();
  if (!cfg) return res.json(null);
  res.json({ ...cfg, smtp_pass: cfg.smtp_pass ? '••••••••' : '' });
});

router.put('/', async (req, res) => {
  const { host, port, secure, smtp_user, smtp_pass, from_name, from_email } = req.body || {};
  const existing = await getConfig();
  if (existing) {
    const pass = smtp_pass && smtp_pass !== '••••••••' ? smtp_pass : existing.smtp_pass;
    await run(
      'UPDATE smtp_config SET host = ?, port = ?, secure = ?, smtp_user = ?, smtp_pass = ?, from_name = ?, from_email = ? WHERE id = ?',
      [host || '', Number(port) || 587, secure ? 1 : 0, smtp_user || '', pass, from_name || '', from_email || '', existing.id]
    );
  } else {
    await insert('smtp_config', {
      host: host || '',
      port: Number(port) || 587,
      secure: secure ? 1 : 0,
      smtp_user: smtp_user || '',
      smtp_pass: smtp_pass || '',
      from_name: from_name || '',
      from_email: from_email || '',
    });
  }
  res.json({ ok: true });
});

export default router;
export { getConfig };
