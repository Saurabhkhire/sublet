import express from 'express';
import { get, all, run, insert } from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { matchProfiles } from '../services/matchingEngine.js';

const router = express.Router();
router.use(authRequired);

function parseProfile(row) {
  return {
    ...row,
    tracks: JSON.parse(row.tracks || '[]'),
    sponsors: JSON.parse(row.sponsors || '[]'),
  };
}

// Opt in / update your team-matching profile (optional feature).
router.post('/profile', async (req, res) => {
  const { role, plan_to_build, tracks, sponsors } = req.body || {};
  if (!role || !plan_to_build) {
    return res.status(400).json({ error: 'Role and what you plan to build are required' });
  }
  const tracksJson = JSON.stringify(Array.isArray(tracks) ? tracks : []);
  const sponsorsJson = JSON.stringify(Array.isArray(sponsors) ? sponsors : []);

  const existing = await get('SELECT * FROM matching_profiles WHERE user_id = ?', [req.user.id]);
  if (existing) {
    if (existing.matched === 1) {
      return res.status(409).json({
        error: 'You have already been matched and cannot change your profile',
      });
    }
    await run(
      'UPDATE matching_profiles SET role = ?, plan_to_build = ?, tracks = ?, sponsors = ? WHERE user_id = ?',
      [role, plan_to_build, tracksJson, sponsorsJson, req.user.id]
    );
    return res.json({ ok: true, updated: true });
  }
  await insert('matching_profiles', {
    user_id: req.user.id,
    role,
    plan_to_build,
    tracks: tracksJson,
    sponsors: sponsorsJson,
    matched: 0,
    group_id: null,
    created_at: new Date().toISOString(),
  });
  res.status(201).json({ ok: true, created: true });
});

// Your own profile + group.
router.get('/me', async (req, res) => {
  const row = await get('SELECT * FROM matching_profiles WHERE user_id = ?', [req.user.id]);
  if (!row) return res.json({ profile: null, group: [] });
  const profile = parseProfile(row);
  let group = [];
  if (profile.group_id) {
    group = await all(
      `SELECT u.id, u.email, u.linkedin, mp.role, mp.plan_to_build
       FROM matching_profiles mp JOIN users u ON u.id = mp.user_id
       WHERE mp.group_id = ?`,
      [profile.group_id]
    );
  }
  res.json({ profile, group });
});

/* ----------------------- Admin-only views ----------------------- */

// Everyone who opted into team matching.
router.get('/profiles', adminRequired, async (_req, res) => {
  const rows = await all(
    `SELECT mp.*, u.email, u.linkedin
     FROM matching_profiles mp JOIN users u ON u.id = mp.user_id
     ORDER BY mp.matched, mp.id`
  );
  res.json(rows.map(parseProfile));
});

// Past runs + current groups.
router.get('/runs', adminRequired, async (_req, res) => {
  res.json(await all('SELECT * FROM matching_runs ORDER BY id DESC'));
});

router.get('/groups', adminRequired, async (_req, res) => {
  const rows = await all(
    `SELECT mp.group_id, u.id as user_id, u.email, u.linkedin, mp.role, mp.plan_to_build
     FROM matching_profiles mp JOIN users u ON u.id = mp.user_id
     WHERE mp.group_id IS NOT NULL
     ORDER BY mp.group_id, u.id`
  );
  const groups = {};
  for (const r of rows) {
    (groups[r.group_id] ||= { group_id: r.group_id, members: [] }).members.push(r);
  }
  res.json(Object.values(groups));
});

// Trigger matching. Only operates on people not yet matched (matched = 0),
// so re-running only groups newcomers and never re-shuffles existing teams.
router.post('/run', adminRequired, async (_req, res) => {
  const rows = await all('SELECT * FROM matching_profiles WHERE matched = 0');
  if (rows.length === 0) {
    return res.status(400).json({ error: 'No new people have opted in since the last run' });
  }
  const profiles = rows.map(parseProfile);
  const groups = await matchProfiles(profiles);

  const runId = await insert('matching_runs', {
    created_at: new Date().toISOString(),
    group_count: groups.length,
    people_count: profiles.length,
  });

  // group_id is unique across runs: encode run + index to avoid collisions.
  let idx = 0;
  for (const group of groups) {
    const groupId = runId * 1000 + idx++;
    for (const p of group) {
      await run('UPDATE matching_profiles SET matched = 1, group_id = ? WHERE id = ?', [
        groupId,
        p.id,
      ]);
    }
  }
  res.json({
    run_id: runId,
    groups: groups.map((g, i) => ({
      group_id: runId * 1000 + i,
      members: g.map((p) => ({ user_id: p.user_id, role: p.role })),
    })),
  });
});

export default router;
