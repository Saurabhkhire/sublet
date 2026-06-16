// Legacy migration: upgrades a pre-multi-hackathon SQLite database in place and moves all
// existing data into a single hackathon named "Ziward Hackathon".
//
// Only runs on SQLite (local). Fresh Postgres/Neon deployments start on the new schema, so
// there is nothing to migrate there.
import { isPg, get, all, run, insert } from './db.js';

const PK = 'INTEGER PRIMARY KEY AUTOINCREMENT';

async function tableExists(name) {
  const r = await get(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, [name]);
  return !!r;
}

async function columnNames(table) {
  const rows = await all(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

export async function migrateLegacy() {
  if (isPg) return; // fresh schema on Postgres; no legacy data to migrate
  if (!(await tableExists('tracks'))) return; // brand-new DB; schema.js already built it

  const trackCols = await columnNames('tracks');
  if (trackCols.includes('hackathon_id')) return; // already on the new schema

  console.log('[migrate] legacy schema detected — upgrading and moving data to "Ziward Hackathon"');

  // Carry over old hackathon details from the single config row, if present.
  let details = '';
  if (await tableExists('config')) {
    const cfg = await get('SELECT * FROM config WHERE id = 1');
    if (cfg) details = cfg.details || '';
  }
  const adminEmail = process.env.ADMIN_EMAIL || 'admin123';
  const adminUser = await get('SELECT id FROM users WHERE email = ?', [adminEmail]);

  // In a legacy DB the only way a hackathon row can already exist is a stray one auto-created
  // by a partially-run seed. Reuse it (rename to "Ziward Hackathon") so we don't leave a
  // duplicate empty hackathon behind; otherwise create a fresh one.
  let hid;
  const stray = await get('SELECT id FROM hackathons ORDER BY id LIMIT 1');
  if (stray) {
    hid = stray.id;
    await run('UPDATE hackathons SET name = ?, details = ? WHERE id = ?', ['Ziward Hackathon', details, hid]);
  } else {
    hid = await insert('hackathons', {
      name: 'Ziward Hackathon',
      details,
      created_by: adminUser ? adminUser.id : null,
      created_at: new Date().toISOString(),
    });
  }

  // Simple tables: add hackathon_id and backfill.
  const addAndFill = async (table) => {
    if (!(await tableExists(table))) return;
    const cols = await columnNames(table);
    if (!cols.includes('hackathon_id')) {
      await run(`ALTER TABLE ${table} ADD COLUMN hackathon_id INTEGER`);
    }
    await run(`UPDATE ${table} SET hackathon_id = ? WHERE hackathon_id IS NULL`, [hid]);
  };
  for (const t of ['tracks', 'sponsors', 'projects', 'matching_runs']) {
    await addAndFill(t);
  }

  // Constrained tables: rebuild so the unique key becomes (hackathon_id, user_id) instead of
  // the old global (user_id) — otherwise migrated users couldn't join a future hackathon.
  if (await tableExists('project_participants')) {
    await run(`ALTER TABLE project_participants RENAME TO _pp_old`);
    await run(`CREATE TABLE project_participants (
      id ${PK}, hackathon_id INTEGER NOT NULL, project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL, UNIQUE (hackathon_id, user_id))`);
    await run(
      `INSERT INTO project_participants (hackathon_id, project_id, user_id)
       SELECT ?, project_id, user_id FROM _pp_old`,
      [hid]
    );
    await run(`DROP TABLE _pp_old`);
  }

  if (await tableExists('matching_profiles')) {
    await run(`ALTER TABLE matching_profiles RENAME TO _mp_old`);
    await run(`CREATE TABLE matching_profiles (
      id ${PK}, hackathon_id INTEGER NOT NULL, user_id INTEGER NOT NULL, role TEXT NOT NULL,
      plan_to_build TEXT NOT NULL, tracks TEXT NOT NULL DEFAULT '[]', sponsors TEXT NOT NULL DEFAULT '[]',
      matched INTEGER NOT NULL DEFAULT 0, group_id INTEGER, created_at TEXT NOT NULL DEFAULT '1970-01-01',
      UNIQUE (hackathon_id, user_id))`);
    await run(
      `INSERT INTO matching_profiles
         (hackathon_id, user_id, role, plan_to_build, tracks, sponsors, matched, group_id, created_at)
       SELECT ?, user_id, role, plan_to_build, tracks, sponsors, matched, group_id, created_at FROM _mp_old`,
      [hid]
    );
    await run(`DROP TABLE _mp_old`);
  }

  // Migrate the old global is_judge flag into per-hackathon judge access.
  const userCols = await columnNames('users');
  if (userCols.includes('is_judge')) {
    const judges = await all('SELECT id FROM users WHERE is_judge = 1');
    for (const j of judges) {
      const exists = await get('SELECT 1 FROM hackathon_judges WHERE hackathon_id = ? AND user_id = ?', [hid, j.id]);
      if (!exists) await insert('hackathon_judges', { hackathon_id: hid, user_id: j.id });
    }
  }

  console.log(`[migrate] done — all existing data moved to "Ziward Hackathon" (id ${hid})`);
}
