import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, hackathonContext, adminOnly, optionalAuth, optionalHackathonContext } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// List all speakers for this hackathon ordered by order_index — public (no login needed).
router.get('/', optionalAuth, optionalHackathonContext, async (req, res) => {
  const rows = await all(
    'SELECT * FROM speakers WHERE hackathon_id = ? ORDER BY order_index ASC, id ASC',
    [req.hackathonId]
  );
  res.json(rows);
});

// Create a speaker (admin only).
router.post('/', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const { name, title, duration_minutes, scheduled_start, notes, break_after_minutes, voice_agent, voice_script } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Speaker name is required' });
  }
  const last = await get(
    'SELECT MAX(order_index) as m FROM speakers WHERE hackathon_id = ?',
    [req.hackathonId]
  );
  const order_index = (last?.m != null ? last.m : -1) + 1;
  const id = await insert('speakers', {
    hackathon_id: req.hackathonId,
    name: String(name).trim(),
    title: title || '',
    duration_minutes: Math.max(1, Number(duration_minutes) || 15),
    order_index,
    status: 'scheduled',
    scheduled_start: scheduled_start || '',
    actual_start: '',
    actual_end: '',
    notes: notes || '',
    break_after_minutes: Math.max(0, Number(break_after_minutes) || 0),
    voice_agent: voice_agent || 'none',
    voice_script: voice_script || '',
    created_at: new Date().toISOString(),
  });
  res.status(201).json(await get('SELECT * FROM speakers WHERE id = ?', [id]));
});

// Bulk reorder — must be defined BEFORE /:id to avoid :id matching "reorder".
router.put('/reorder', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array [{id, order_index}]' });
  for (const { id, order_index } of items) {
    await run(
      'UPDATE speakers SET order_index = ? WHERE id = ? AND hackathon_id = ?',
      [order_index, id, req.hackathonId]
    );
  }
  res.json(
    await all('SELECT * FROM speakers WHERE hackathon_id = ? ORDER BY order_index ASC, id ASC', [req.hackathonId])
  );
});

// Update a single speaker (admin only) — any subset of fields.
router.put('/:id', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const sp = await get('SELECT * FROM speakers WHERE id = ? AND hackathon_id = ?', [req.params.id, req.hackathonId]);
  if (!sp) return res.status(404).json({ error: 'Speaker not found' });
  const { name, title, duration_minutes, status, scheduled_start, actual_start, actual_end, order_index, notes, break_after_minutes, voice_agent, voice_script } = req.body || {};
  await run(
    `UPDATE speakers SET
       name = ?, title = ?, duration_minutes = ?, status = ?,
       scheduled_start = ?, actual_start = ?, actual_end = ?, order_index = ?, notes = ?, break_after_minutes = ?,
       voice_agent = ?, voice_script = ?
     WHERE id = ?`,
    [
      name !== undefined ? String(name).trim() || sp.name : sp.name,
      title !== undefined ? title : sp.title,
      duration_minutes !== undefined ? Math.max(1, Number(duration_minutes)) : sp.duration_minutes,
      status !== undefined ? status : sp.status,
      scheduled_start !== undefined ? scheduled_start : sp.scheduled_start,
      actual_start !== undefined ? actual_start : sp.actual_start,
      actual_end !== undefined ? actual_end : sp.actual_end,
      order_index !== undefined ? Number(order_index) : sp.order_index,
      notes !== undefined ? notes : (sp.notes || ''),
      break_after_minutes !== undefined ? Math.max(0, Number(break_after_minutes)) : (sp.break_after_minutes || 0),
      voice_agent !== undefined ? voice_agent : (sp.voice_agent || 'none'),
      voice_script !== undefined ? voice_script : (sp.voice_script || ''),
      sp.id,
    ]
  );
  res.json(await get('SELECT * FROM speakers WHERE id = ?', [sp.id]));
});

// Delete a speaker (admin only).
router.delete('/:id', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const sp = await get('SELECT * FROM speakers WHERE id = ? AND hackathon_id = ?', [req.params.id, req.hackathonId]);
  if (!sp) return res.status(404).json({ error: 'Speaker not found' });
  await run('DELETE FROM speakers WHERE id = ?', [sp.id]);
  res.json({ ok: true });
});

export default router;
