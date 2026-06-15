// Unified database layer.
// - Local development: SQLite (better-sqlite3), file at backend/data/app.db
// - Deployed: Neon / Postgres when DATABASE_URL is set to a postgres connection string.
//
// All app code uses the async interface below with `?` placeholders. For Postgres
// the placeholders are rewritten to $1, $2, ... automatically.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL || '';
export const isPg = DATABASE_URL.startsWith('postgres');

let sqlite = null;
let pgPool = null;

function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

if (isPg) {
  const pg = await import('pg');
  pgPool = new pg.default.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  // Built into Node (no native compilation needed).
  const { DatabaseSync } = await import('node:sqlite');
  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const dbFile = process.env.SQLITE_FILE || path.join(dataDir, 'app.db');
  sqlite = new DatabaseSync(dbFile);
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');
}

/** Run a statement (INSERT/UPDATE/DELETE/DDL). */
export async function run(sql, params = []) {
  if (isPg) {
    await pgPool.query(toPgPlaceholders(sql), params);
    return;
  }
  sqlite.prepare(sql).run(...params);
}

/** Return the first matching row or undefined. */
export async function get(sql, params = []) {
  if (isPg) {
    const r = await pgPool.query(toPgPlaceholders(sql), params);
    return r.rows[0];
  }
  return sqlite.prepare(sql).get(...params);
}

/** Return all matching rows. */
export async function all(sql, params = []) {
  if (isPg) {
    const r = await pgPool.query(toPgPlaceholders(sql), params);
    return r.rows;
  }
  return sqlite.prepare(sql).all(...params);
}

/** Insert a row and return its generated id. */
export async function insert(table, data) {
  const keys = Object.keys(data);
  const cols = keys.join(', ');
  const values = keys.map((k) => data[k]);
  if (isPg) {
    const ph = keys.map((_, i) => `$${i + 1}`).join(', ');
    const r = await pgPool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${ph}) RETURNING id`,
      values
    );
    return r.rows[0].id;
  }
  const ph = keys.map(() => '?').join(', ');
  const info = sqlite.prepare(`INSERT INTO ${table} (${cols}) VALUES (${ph})`).run(...values);
  return Number(info.lastInsertRowid);
}

/** Run multiple statements (used for schema creation). */
export async function exec(sqlText) {
  if (isPg) {
    await pgPool.query(sqlText);
    return;
  }
  sqlite.exec(sqlText);
}

export async function close() {
  if (isPg) await pgPool.end();
  else sqlite.close();
}
