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

// Rebuilds the scores table when it still has the old 6-category columns. The scoring model
// changed (5 categories each 0–100, total = their average), so old rows are not carried over.
export async function migrateScores() {
  if (isPg) {
    // For Postgres: drop old columns and add new ones using IF EXISTS / IF NOT EXISTS.
    await run('ALTER TABLE scores DROP COLUMN IF EXISTS technical');
    await run('ALTER TABLE scores DROP COLUMN IF EXISTS code_quality');
    await run('ALTER TABLE scores DROP COLUMN IF EXISTS functionality');
    await run('ALTER TABLE scores DROP COLUMN IF EXISTS ux');
    await run('ALTER TABLE scores ADD COLUMN IF NOT EXISTS execution INTEGER NOT NULL DEFAULT 0');
    await run('ALTER TABLE scores ADD COLUMN IF NOT EXISTS impact INTEGER NOT NULL DEFAULT 0');
    await run('ALTER TABLE scores ADD COLUMN IF NOT EXISTS implementation INTEGER NOT NULL DEFAULT 0');
    await run('ALTER TABLE scores ALTER COLUMN total TYPE REAL');
    return;
  }
  if (!(await tableExists('scores'))) return;
  const cols = await columnNames('scores');
  if (cols.includes('execution')) return; // already on the new schema
  if (!cols.includes('technical')) return; // unknown shape — leave it alone

  console.log('[migrate] updating scores to the 5-category model (presentation/execution/innovation/impact/implementation)');
  await run('DROP TABLE scores');
  await run(`CREATE TABLE scores (
    id ${PK}, project_id INTEGER NOT NULL, judge_id INTEGER NOT NULL,
    presentation INTEGER NOT NULL DEFAULT 0, execution INTEGER NOT NULL DEFAULT 0,
    innovation INTEGER NOT NULL DEFAULT 0, impact INTEGER NOT NULL DEFAULT 0,
    implementation INTEGER NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
    investment REAL NOT NULL DEFAULT 0, comments TEXT NOT NULL DEFAULT '',
    UNIQUE (project_id, judge_id))`);
}

// Adds the richer hackathon/track/sponsor info columns to existing tables.
export async function migrateHackathonInfo() {
  if (isPg) {
    // Postgres supports ADD COLUMN IF NOT EXISTS natively — safe to run every boot.
    const cols = [
      ['hackathons', 'support_info'],
      ['hackathons', 'schedule'],
      ['hackathons', 'event_date'],
      ['hackathons', 'start_time'],
      ['hackathons', 'end_time'],
      ['hackathons', 'location'],
      ['tracks', 'description'],
      ['sponsors', 'description'],
      ['sponsors', 'access_instructions'],
      ['sponsors', 'prizes'],
    ];
    for (const [table, col] of cols) {
      await run(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} TEXT NOT NULL DEFAULT ''`);
    }
    return;
  }
  const add = async (table, col) => {
    if (!(await tableExists(table))) return;
    const cols = await columnNames(table);
    if (!cols.includes(col)) {
      await run(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
    }
  };
  await add('hackathons', 'support_info');
  await add('hackathons', 'schedule');
  await add('hackathons', 'event_date');
  await add('hackathons', 'start_time');
  await add('hackathons', 'end_time');
  await add('hackathons', 'location');
  await add('tracks', 'description');
  await add('sponsors', 'description');
  await add('sponsors', 'access_instructions');
  await add('sponsors', 'prizes');
}

// Adds the per-judge investment column to an existing scores table.
export async function migrateInvestment() {
  if (isPg) {
    await run('ALTER TABLE scores ADD COLUMN IF NOT EXISTS investment REAL NOT NULL DEFAULT 0');
    return;
  }
  if (!(await tableExists('scores'))) return;
  const cols = await columnNames('scores');
  if (!cols.includes('investment')) {
    await run('ALTER TABLE scores ADD COLUMN investment REAL NOT NULL DEFAULT 0');
    console.log('[migrate] added investment column to scores');
  }
}

// Adds the notes column to the speakers table.
export async function migrateSpeakerNotes() {
  if (isPg) {
    await run('ALTER TABLE speakers ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT \'\'');
    return;
  }
  if (!(await tableExists('speakers'))) return;
  const cols = await columnNames('speakers');
  if (!cols.includes('notes')) {
    await run('ALTER TABLE speakers ADD COLUMN notes TEXT NOT NULL DEFAULT \'\'');
  }
}

// Adds the break_after_minutes column to the speakers table.
export async function migrateSpeakerBreak() {
  if (isPg) {
    await run('ALTER TABLE speakers ADD COLUMN IF NOT EXISTS break_after_minutes INTEGER NOT NULL DEFAULT 0');
    return;
  }
  if (!(await tableExists('speakers'))) return;
  const cols = await columnNames('speakers');
  if (!cols.includes('break_after_minutes')) {
    await run('ALTER TABLE speakers ADD COLUMN break_after_minutes INTEGER NOT NULL DEFAULT 0');
  }
}

// Adds judge_group/attended_at to hackathon_judges, judge_group/award_tag to projects,
// and creates the judging_config table.
export async function migrateJudgingGroups() {
  if (isPg) {
    await run("ALTER TABLE hackathon_judges ADD COLUMN IF NOT EXISTS judge_group TEXT NOT NULL DEFAULT ''");
    await run("ALTER TABLE hackathon_judges ADD COLUMN IF NOT EXISTS attended_at TEXT NOT NULL DEFAULT ''");
    await run("ALTER TABLE projects ADD COLUMN IF NOT EXISTS judge_group TEXT NOT NULL DEFAULT ''");
    await run("ALTER TABLE projects ADD COLUMN IF NOT EXISTS award_tag TEXT NOT NULL DEFAULT ''");
    await run(`CREATE TABLE IF NOT EXISTS judging_config (
      id SERIAL PRIMARY KEY,
      hackathon_id INTEGER NOT NULL UNIQUE,
      judge_time_minutes INTEGER NOT NULL DEFAULT 60,
      per_project_minutes INTEGER NOT NULL DEFAULT 5,
      group_count INTEGER NOT NULL DEFAULT 0,
      assigned_at TEXT NOT NULL DEFAULT '',
      auto_assign_stopped INTEGER NOT NULL DEFAULT 0
    )`);
    await run("ALTER TABLE judging_config ADD COLUMN IF NOT EXISTS auto_assign_stopped INTEGER NOT NULL DEFAULT 0");
    return;
  }
  const addCol = async (table, col, type) => {
    if (!(await tableExists(table))) return;
    const cols = await columnNames(table);
    if (!cols.includes(col)) await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  };
  await addCol('hackathon_judges', 'judge_group', "TEXT NOT NULL DEFAULT ''");
  await addCol('hackathon_judges', 'attended_at', "TEXT NOT NULL DEFAULT ''");
  await addCol('projects', 'judge_group', "TEXT NOT NULL DEFAULT ''");
  await addCol('projects', 'award_tag', "TEXT NOT NULL DEFAULT ''");
  if (!(await tableExists('judging_config'))) {
    await run(`CREATE TABLE judging_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hackathon_id INTEGER NOT NULL UNIQUE,
      judge_time_minutes INTEGER NOT NULL DEFAULT 60,
      per_project_minutes INTEGER NOT NULL DEFAULT 5,
      group_count INTEGER NOT NULL DEFAULT 0,
      assigned_at TEXT NOT NULL DEFAULT '',
      auto_assign_stopped INTEGER NOT NULL DEFAULT 0
    )`);
  } else {
    await addCol('judging_config', 'auto_assign_stopped', 'INTEGER NOT NULL DEFAULT 0');
  }
}

// Creates the demo_slots table (already in schema for fresh DBs; migration for existing ones).
export async function migrateDemoSlots() {
  if (isPg) {
    await run(`CREATE TABLE IF NOT EXISTS demo_slots (
      id SERIAL PRIMARY KEY,
      hackathon_id INTEGER NOT NULL,
      project_id INTEGER,
      custom_name TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      duration_minutes INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'scheduled',
      scheduled_start TEXT NOT NULL DEFAULT '',
      actual_start TEXT NOT NULL DEFAULT '',
      actual_end TEXT NOT NULL DEFAULT '',
      break_after_minutes INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    )`);
    return;
  }
  if (!(await tableExists('demo_slots'))) {
    await run(`CREATE TABLE demo_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hackathon_id INTEGER NOT NULL,
      project_id INTEGER,
      custom_name TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      duration_minutes INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'scheduled',
      scheduled_start TEXT NOT NULL DEFAULT '',
      actual_start TEXT NOT NULL DEFAULT '',
      actual_end TEXT NOT NULL DEFAULT '',
      break_after_minutes INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    )`);
  }
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

// Creates the email_sends table to track which emails have already been sent per user+type.
export async function migrateEmailSends() {
  if (isPg) {
    await run(`CREATE TABLE IF NOT EXISTS email_sends (
      id SERIAL PRIMARY KEY,
      hackathon_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      email_type TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT '',
      UNIQUE (hackathon_id, user_id, email_type)
    )`);
    return;
  }
  if (!(await tableExists('email_sends'))) {
    await run(`CREATE TABLE email_sends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hackathon_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      email_type TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT '',
      UNIQUE (hackathon_id, user_id, email_type)
    )`);
  }
}

// Adds voice_enabled, submission_deadline, submission_rules, judging_rules to hackathons,
// and creates the smtp_config table.
export async function migrateVoiceAndRules() {
  if (isPg) {
    await run("ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS voice_enabled INTEGER NOT NULL DEFAULT 0");
    await run("ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS voice_mode TEXT NOT NULL DEFAULT 'off'");
    await run("ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS auto_stop_speaker INTEGER NOT NULL DEFAULT 1");
    await run("ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS auto_advance_demo INTEGER NOT NULL DEFAULT 1");
    await run("ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS submission_deadline TEXT NOT NULL DEFAULT ''");
    await run("ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS submission_rules TEXT NOT NULL DEFAULT ''");
    await run("ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS judging_rules TEXT NOT NULL DEFAULT ''");
    await run(`CREATE TABLE IF NOT EXISTS smtp_config (
      id SERIAL PRIMARY KEY,
      host TEXT NOT NULL DEFAULT '',
      port INTEGER NOT NULL DEFAULT 587,
      secure INTEGER NOT NULL DEFAULT 0,
      smtp_user TEXT NOT NULL DEFAULT '',
      smtp_pass TEXT NOT NULL DEFAULT '',
      from_name TEXT NOT NULL DEFAULT '',
      from_email TEXT NOT NULL DEFAULT ''
    )`);
    return;
  }
  const add = async (table, col, type) => {
    if (!(await tableExists(table))) return;
    const cols = await columnNames(table);
    if (!cols.includes(col)) await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  };
  await add('hackathons', 'voice_enabled', 'INTEGER NOT NULL DEFAULT 0');
  await add('hackathons', 'voice_mode', "TEXT NOT NULL DEFAULT 'off'");
  await add('hackathons', 'auto_stop_speaker', 'INTEGER NOT NULL DEFAULT 1');
  await add('hackathons', 'auto_advance_demo', 'INTEGER NOT NULL DEFAULT 1');
  await add('hackathons', 'submission_deadline', "TEXT NOT NULL DEFAULT ''");
  await add('hackathons', 'submission_rules', "TEXT NOT NULL DEFAULT ''");
  await add('hackathons', 'judging_rules', "TEXT NOT NULL DEFAULT ''");
  if (!(await tableExists('smtp_config'))) {
    await run(`CREATE TABLE smtp_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host TEXT NOT NULL DEFAULT '',
      port INTEGER NOT NULL DEFAULT 587,
      secure INTEGER NOT NULL DEFAULT 0,
      smtp_user TEXT NOT NULL DEFAULT '',
      smtp_pass TEXT NOT NULL DEFAULT '',
      from_name TEXT NOT NULL DEFAULT '',
      from_email TEXT NOT NULL DEFAULT ''
    )`);
  }
}
