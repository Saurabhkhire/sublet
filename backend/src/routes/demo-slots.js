import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, hackathonContext, adminOnly, optionalAuth, optionalHackathonContext } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

async function slotWithProject(slot) {
  if (!slot) return null;
  if (!slot.project_id) return slot;
  const project = await get('SELECT id, name, award_tag, judge_group, short_description FROM projects WHERE id = ?', [slot.project_id]);
  const team = await all(
    `SELECT u.email FROM project_participants pp JOIN users u ON u.id = pp.user_id WHERE pp.project_id = ?`,
    [slot.project_id]
  );
  return { ...slot, project_name: project?.name || '', project_award: project?.award_tag || '', project_judge_group: project?.judge_group || '', project_description: project?.short_description || '', team: team.map((t) => t.email) };
}

// List all demo slots with joined project info — public (no login needed).
router.get('/', optionalAuth, optionalHackathonContext, async (req, res) => {
  const rows = await all(
    'SELECT * FROM demo_slots WHERE hackathon_id = ? ORDER BY order_index, id',
    [req.hackathonId]
  );
  const detailed = [];
  for (const row of rows) detailed.push(await slotWithProject(row));
  res.json(detailed);
});

// Create a demo slot (admin)
router.post('/', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const { project_id, custom_name, duration_minutes, scheduled_start, notes, break_after_minutes, voice_agent, voice_script } = req.body || {};
  if (!project_id && !String(custom_name || '').trim()) {
    return res.status(400).json({ error: 'Either project_id or custom_name is required' });
  }
  if (project_id) {
    const p = await get('SELECT id FROM projects WHERE id = ? AND hackathon_id = ?', [project_id, req.hackathonId]);
    if (!p) return res.status(404).json({ error: 'Project not found' });
  }
  const last = await get('SELECT MAX(order_index) as m FROM demo_slots WHERE hackathon_id = ?', [req.hackathonId]);
  const id = await insert('demo_slots', {
    hackathon_id: req.hackathonId,
    project_id: project_id ? Number(project_id) : null,
    custom_name: custom_name || '',
    order_index: (last?.m ?? -1) + 1,
    duration_minutes: Math.max(1, Number(duration_minutes) || 10),
    status: 'scheduled',
    scheduled_start: scheduled_start || '',
    actual_start: '',
    actual_end: '',
    break_after_minutes: Math.max(0, Number(break_after_minutes) || 0),
    notes: notes || '',
    voice_agent: voice_agent || 'none',
    voice_script: voice_script || '',
    created_at: new Date().toISOString(),
  });
  res.status(201).json(await slotWithProject(await get('SELECT * FROM demo_slots WHERE id = ?', [id])));
});

// Reorder — must be BEFORE /:id
router.put('/reorder', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Array expected' });
  for (const { id, order_index } of items) {
    await run('UPDATE demo_slots SET order_index = ? WHERE id = ? AND hackathon_id = ?',
      [order_index, id, req.hackathonId]);
  }
  res.json({ ok: true });
});

// Update a slot
router.put('/:id', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const slot = await get('SELECT * FROM demo_slots WHERE id = ? AND hackathon_id = ?', [req.params.id, req.hackathonId]);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  const { project_id, custom_name, duration_minutes, status, scheduled_start, actual_start, actual_end, order_index, notes, break_after_minutes, voice_agent, voice_script } = req.body || {};
  await run(
    `UPDATE demo_slots SET
       project_id = ?, custom_name = ?, duration_minutes = ?, status = ?,
       scheduled_start = ?, actual_start = ?, actual_end = ?, order_index = ?, notes = ?, break_after_minutes = ?,
       voice_agent = ?, voice_script = ?
     WHERE id = ?`,
    [
      project_id !== undefined ? (project_id ? Number(project_id) : null) : slot.project_id,
      custom_name !== undefined ? custom_name : slot.custom_name,
      duration_minutes !== undefined ? Math.max(1, Number(duration_minutes)) : slot.duration_minutes,
      status !== undefined ? status : slot.status,
      scheduled_start !== undefined ? scheduled_start : slot.scheduled_start,
      actual_start !== undefined ? actual_start : slot.actual_start,
      actual_end !== undefined ? actual_end : slot.actual_end,
      order_index !== undefined ? Number(order_index) : slot.order_index,
      notes !== undefined ? notes : slot.notes,
      break_after_minutes !== undefined ? Math.max(0, Number(break_after_minutes)) : (slot.break_after_minutes || 0),
      voice_agent !== undefined ? voice_agent : (slot.voice_agent || 'none'),
      voice_script !== undefined ? voice_script : (slot.voice_script || ''),
      slot.id,
    ]
  );
  res.json(await slotWithProject(await get('SELECT * FROM demo_slots WHERE id = ?', [slot.id])));
});

// Delete a slot
router.delete('/:id', authRequired, hackathonContext, adminOnly, async (req, res) => {
  const slot = await get('SELECT id FROM demo_slots WHERE id = ? AND hackathon_id = ?', [req.params.id, req.hackathonId]);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  await run('DELETE FROM demo_slots WHERE id = ?', [slot.id]);
  res.json({ ok: true });
});

export default router;
