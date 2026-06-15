# 5) Database Structure

Source of truth: `backend/src/schema.js`. Booleans are stored as INTEGER (0/1) in both SQLite
and Postgres so application logic is identical. JSON-ish lists (matching tracks/sponsors) are
stored as TEXT.

## 5.1 ER / Relationship Notes
- `users` **1—1** `matching_profiles` (a user has at most one matching profile).
- `users` **1—M** `projects` (as `created_by`); `users` **M—M** `projects` through
  `project_participants`, but constrained to **at most one** project per user.
- `projects` **M—M** `tracks` through `project_tracks`; `projects` **M—M** `sponsors` through
  `project_sponsors`.
- `projects` **1—M** `scores`; `users` (judges) **1—M** `scores`; one score per
  (project, judge).
- `matching_profiles` group membership is denormalized via `group_id`; a `matching_runs` row
  records each matching execution.

## 5.2 Tables

### Table: `users`
- **Purpose:** Accounts (participants, judges, admin).
- **Primary Key:** `id`
- **Foreign Keys:** none
- **Unique Constraints:** `email`
- **Columns:**
  - `id` | integer | no | PK | account id
  - `email` | text | no | unique | login email (admin account is `admin123`)
  - `password_hash` | text | no | — | bcrypt hash
  - `linkedin` | text | yes | — | LinkedIn URL
  - `role` | text | no | — | `'user'` or `'admin'` (default `'user'`)
  - `is_judge` | integer | no | — | 1 = may view & judge projects (default 0)
  - `created_at` | text | no | — | ISO timestamp

### Table: `config`
- **Purpose:** Single-row hackathon settings.
- **Primary Key:** `id` (always 1)
- **Columns:** `id` integer PK; `hackathon_name` text; `details` text.

### Table: `tracks`
- **Purpose:** Hackathon tracks (multiple entries).
- **Primary Key:** `id` · **Columns:** `id` integer PK; `name` text.

### Table: `sponsors`
- **Purpose:** Sponsors (multiple entries).
- **Primary Key:** `id` · **Columns:** `id` integer PK; `name` text.

### Table: `matching_profiles`
- **Purpose:** A participant's team-matching opt-in.
- **Primary Key:** `id`
- **Foreign Keys:** `user_id` → `users.id` (logical)
- **Unique Constraints:** `user_id`
- **Columns:**
  - `id` | integer | no | PK |
  - `user_id` | integer | no | unique (FK) | owner
  - `role` | text | no | — | selected role (one of ~28)
  - `plan_to_build` | text | no | — | free text used for AI similarity
  - `tracks` | text | no | — | JSON array of track ids
  - `sponsors` | text | no | — | JSON array of sponsor ids
  - `matched` | integer | no | — | 1 once placed in a team (default 0)
  - `group_id` | integer | yes | — | assigned team id after matching
  - `created_at` | text | no | — | ISO timestamp

### Table: `matching_runs`
- **Purpose:** Audit of each matching execution.
- **Primary Key:** `id` · **Columns:** `id` integer PK; `created_at` text;
  `group_count` integer; `people_count` integer.

### Table: `projects`
- **Purpose:** A submitted project.
- **Primary Key:** `id`
- **Foreign Keys:** `created_by` → `users.id` (logical)
- **Columns:** `id` PK; `name` text; `short_description` text; `demo_video_link` text;
  `git_link` text; `created_by` integer; `created_at` text.

### Table: `project_participants`
- **Purpose:** Team membership; enforces **one project per person**.
- **Primary Key:** `id`
- **Unique Constraints:** `user_id` (a user appears in at most one project)
- **Columns:** `id` PK; `project_id` integer (FK→projects.id); `user_id` integer unique
  (FK→users.id).

### Table: `project_tracks`
- **Purpose:** Tracks a project targets (M—M).
- **Columns:** `project_id` integer; `track_id` integer.

### Table: `project_sponsors`
- **Purpose:** Sponsors a project used (M—M).
- **Columns:** `project_id` integer; `sponsor_id` integer.

### Table: `scores`
- **Purpose:** One judge's score for one project.
- **Primary Key:** `id`
- **Foreign Keys:** `project_id` → `projects.id`; `judge_id` → `users.id` (logical)
- **Unique Constraints:** `(project_id, judge_id)` — one score per judge per project
- **Columns:**
  - `id` | integer | no | PK |
  - `project_id` | integer | no | FK | scored project
  - `judge_id` | integer | no | FK | scoring judge
  - `presentation` | integer | no | — | 0–20
  - `technical` | integer | no | — | 0–20
  - `code_quality` | integer | no | — | 0–15
  - `functionality` | integer | no | — | 0–15
  - `innovation` | integer | no | — | 0–15
  - `ux` | integer | no | — | 0–15
  - `total` | integer | no | — | sum of the six (0–100)
  - `comments` | text | no | — | free text

> Template note: EventHack's `event_sponsor_replies`, venues, organizers, and team-based
> `submissions`/`judge_scores` tables are **N/A** here — this app uses the per-judge `scores`
> table above and per-person `project_participants` instead.
