# 5) Database Structure

Source of truth: `backend/src/schema.js`. The platform is **multi-hackathon**: most tables are
scoped by `hackathon_id`. Booleans are stored as INTEGER (0/1) in both SQLite and Postgres.
Matching track/sponsor selections are stored as JSON text.

## 5.1 ER / Relationship Notes
- `hackathons` **1—M** everything scoped: `tracks`, `sponsors`, `projects`,
  `matching_profiles`, `matching_runs`, `hackathon_judges`, `project_participants`.
- `users` are **global** accounts. A user relates to a hackathon by: being a judge
  (`hackathon_judges`), opting into matching (`matching_profiles`), or joining a project
  (`project_participants`).
- `users` **M—M** `hackathons` via `hackathon_judges` (who may view & judge).
- A user may be on **at most one project per hackathon** (`UNIQUE(hackathon_id, user_id)` on
  `project_participants`) — but can participate in different hackathons.
- `projects` **M—M** `tracks`/`sponsors` via `project_tracks` / `project_sponsors`.
- `projects` **1—M** `scores`; one score per (project, judge).

## 5.2 Tables

### Table: `users`
- **Purpose:** Global accounts (participants, judges, admin). Judge/view access is per
  hackathon, not a column here.
- **Primary Key:** `id` · **Unique:** `email`
- **Columns:** `id` int PK; `email` text unique; `password_hash` text; `linkedin` text;
  `role` text (`'user'` | `'admin'`); `created_at` text.

### Table: `hackathons`
- **Purpose:** A hackathon instance with its own name, details and scoped data.
- **Primary Key:** `id`
- **Columns:** `id` int PK; `name` text; `details` text; `created_by` int (users.id);
  `created_at` text.

### Table: `tracks` / `sponsors`
- **Purpose:** Tracks / sponsors for one hackathon (multiple entries each).
- **Primary Key:** `id` · **Columns:** `id` int PK; `hackathon_id` int (FK→hackathons.id);
  `name` text.

### Table: `hackathon_judges`
- **Purpose:** Users the admin selected to **view & judge** a given hackathon.
- **Primary Key:** `id` · **Unique:** `(hackathon_id, user_id)`
- **Columns:** `id` int PK; `hackathon_id` int; `user_id` int.

### Table: `matching_profiles`
- **Purpose:** A participant's team-matching opt-in within a hackathon.
- **Primary Key:** `id` · **Unique:** `(hackathon_id, user_id)`
- **Columns:** `id` PK; `hackathon_id` int; `user_id` int; `role` text; `plan_to_build` text;
  `tracks` text (JSON ids); `sponsors` text (JSON ids); `matched` int (0/1); `group_id` int;
  `created_at` text.

### Table: `matching_runs`
- **Purpose:** Audit of each matching run for a hackathon.
- **Columns:** `id` PK; `hackathon_id` int; `created_at` text; `group_count` int;
  `people_count` int.

### Table: `projects`
- **Purpose:** A submitted project within a hackathon.
- **Columns:** `id` PK; `hackathon_id` int; `name` text; `short_description` text;
  `demo_video_link` text; `git_link` text; `created_by` int; `created_at` text.

### Table: `project_participants`
- **Purpose:** Team membership; enforces **one project per person per hackathon**.
- **Primary Key:** `id` · **Unique:** `(hackathon_id, user_id)`
- **Columns:** `id` PK; `hackathon_id` int; `project_id` int; `user_id` int.

### Table: `project_tracks` / `project_sponsors`
- **Purpose:** A project's chosen tracks / sponsors (M—M).
- **Columns:** `project_id` int; `track_id` int — / — `project_id` int; `sponsor_id` int.

### Table: `scores`
- **Purpose:** One judge's score for one project.
- **Primary Key:** `id` · **Unique:** `(project_id, judge_id)`
- **Columns:** `id` PK; `project_id` int; `judge_id` int; `presentation` 0–20; `technical`
  0–20; `code_quality` 0–15; `functionality` 0–15; `innovation` 0–15; `ux` 0–15; `total`
  0–100; `comments` text.

## 5.3 Legacy migration
`backend/src/migrate.js` upgrades a pre-multi-hackathon SQLite database in place: it creates a
hackathon named **"Ziward Hackathon"**, adds `hackathon_id` to the scoped tables and backfills
it, rebuilds `project_participants` / `matching_profiles` so the unique key becomes
`(hackathon_id, user_id)`, and converts the old global `is_judge` flag into `hackathon_judges`
rows. It runs only on SQLite (fresh Postgres/Neon starts on the new schema).
