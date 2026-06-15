// Schema creation. Dialect-aware so the same shape works on SQLite and Postgres.
import { exec, isPg } from './db.js';

const PK = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
// Booleans are stored as INTEGER (0/1) in both engines to keep app code identical.

export async function createSchema() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id ${PK},
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      linkedin TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_judge INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    );

    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY,
      hackathon_name TEXT NOT NULL DEFAULT 'Untitled Hackathon',
      details TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id ${PK},
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id ${PK},
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matching_profiles (
      id ${PK},
      user_id INTEGER UNIQUE NOT NULL,
      role TEXT NOT NULL,
      plan_to_build TEXT NOT NULL,
      tracks TEXT NOT NULL DEFAULT '[]',
      sponsors TEXT NOT NULL DEFAULT '[]',
      matched INTEGER NOT NULL DEFAULT 0,
      group_id INTEGER,
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    );

    CREATE TABLE IF NOT EXISTS matching_runs (
      id ${PK},
      created_at TEXT NOT NULL DEFAULT '1970-01-01',
      group_count INTEGER NOT NULL DEFAULT 0,
      people_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id ${PK},
      name TEXT NOT NULL,
      short_description TEXT NOT NULL DEFAULT '',
      demo_video_link TEXT,
      git_link TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    );

    CREATE TABLE IF NOT EXISTS project_participants (
      id ${PK},
      project_id INTEGER NOT NULL,
      user_id INTEGER UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_tracks (
      project_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_sponsors (
      project_id INTEGER NOT NULL,
      sponsor_id INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scores (
      id ${PK},
      project_id INTEGER NOT NULL,
      judge_id INTEGER NOT NULL,
      presentation INTEGER NOT NULL DEFAULT 0,
      technical INTEGER NOT NULL DEFAULT 0,
      code_quality INTEGER NOT NULL DEFAULT 0,
      functionality INTEGER NOT NULL DEFAULT 0,
      innovation INTEGER NOT NULL DEFAULT 0,
      ux INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      comments TEXT NOT NULL DEFAULT '',
      UNIQUE (project_id, judge_id)
    );
  `);
}
