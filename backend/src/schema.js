// Schema creation. Dialect-aware so the same shape works on SQLite and Postgres.
// The platform is multi-hackathon: most data is scoped by hackathon_id.
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
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    );

    CREATE TABLE IF NOT EXISTS hackathons (
      id ${PK},
      name TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id ${PK},
      hackathon_id INTEGER NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id ${PK},
      hackathon_id INTEGER NOT NULL,
      name TEXT NOT NULL
    );

    -- Users the admin has selected (per hackathon) to view project details and judge.
    CREATE TABLE IF NOT EXISTS hackathon_judges (
      id ${PK},
      hackathon_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE (hackathon_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS matching_profiles (
      id ${PK},
      hackathon_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      plan_to_build TEXT NOT NULL,
      tracks TEXT NOT NULL DEFAULT '[]',
      sponsors TEXT NOT NULL DEFAULT '[]',
      matched INTEGER NOT NULL DEFAULT 0,
      group_id INTEGER,
      created_at TEXT NOT NULL DEFAULT '1970-01-01',
      UNIQUE (hackathon_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS matching_runs (
      id ${PK},
      hackathon_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT '1970-01-01',
      group_count INTEGER NOT NULL DEFAULT 0,
      people_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id ${PK},
      hackathon_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      short_description TEXT NOT NULL DEFAULT '',
      demo_video_link TEXT,
      git_link TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT '1970-01-01'
    );

    -- A person may be on at most one project PER hackathon.
    CREATE TABLE IF NOT EXISTS project_participants (
      id ${PK},
      hackathon_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE (hackathon_id, user_id)
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
