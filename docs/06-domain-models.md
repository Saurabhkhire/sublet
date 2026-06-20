# 6) POJO / Domain Models

This codebase is plain JavaScript with no ORM classes; the "models" are the row shapes returned
by the data layer plus the in-memory shapes used by the matching engine. Fields listed below.

### Model: `User`
- **Fields:**
  - `id: integer`
  - `email: string`
  - `linkedin: string`
  - `role: 'user' | 'admin'` (judge access is per-hackathon, not a field here)
  - `created_at: string (ISO)`
  - `password_hash: string` (server-only; never returned to the client)

### Model: `Hackathon`
- **Fields:** `id: integer`, `name: string`, `details: string` (description),
  `support_info: string` (Community & Support / Discord), `schedule: string`,
  `event_date: string` (YYYY-MM-DD — the day projects may be submitted; empty = unrestricted),
  `start_time: string` (HH:MM), `end_time: string` (HH:MM), `location: string`,
  `created_by: integer`, `created_at: string`. API list shape adds `project_count`,
  `judge_count`, `is_judge`. The meta endpoint also returns `judges: { id, email, linkedin }[]`.

### Model: `HackathonJudge`
- **Fields:** `id: integer`, `hackathon_id: integer`, `user_id: integer` — a user granted
  view+judge access to one hackathon.

### Model: `Track`
- **Fields:** `id: integer`, `hackathon_id: integer`, `name: string`, `description: string`

### Model: `Sponsor`
- **Fields:** `id: integer`, `hackathon_id: integer`, `name: string`, `description: string`,
  `access_instructions: string` (Tool Access & Credits), `prizes: string`

### Model: `MatchingProfile`
- **Fields:**
  - `id: integer`
  - `hackathon_id: integer`
  - `user_id: integer`
  - `role: string`
  - `plan_to_build: string`
  - `tracks: integer[]` (parsed from JSON text)
  - `sponsors: integer[]` (parsed from JSON text)
  - `matched: 0 | 1`
  - `group_id: integer | null`
  - `created_at: string`

### Model: `MatchingRun`
- **Fields:** `id: integer`, `hackathon_id: integer`, `created_at: string`,
  `group_count: integer`, `people_count: integer`

### Model: `Project` (detail shape returned by the API)
- **Fields:**
  - `id: integer`
  - `hackathon_id: integer`
  - `name: string`
  - `short_description: string`
  - `demo_video_link: string`
  - `git_link: string`
  - `created_by: integer`
  - `created_at: string`
  - `participants: { id, email, linkedin }[]`
  - `tracks: { id, name }[]`
  - `sponsors: { id, name }[]`

### Model: `Score`
- **Fields:**
  - `id: integer`
  - `project_id: integer`
  - `judge_id: integer`
  - `presentation: integer (0–100)`
  - `execution: integer (0–100)`
  - `innovation: integer (0–100)`
  - `impact: integer (0–100)`
  - `implementation: integer (0–100)`
  - `total: number (0–100)` — the average of the five categories
  - `investment: number (≥ 0)` — how much this judge would invest in the project
  - `comments: string`

### Model: `ScoreCriterion` (config constant, `backend/src/constants.js`)
- **Fields:** `key: string`, `label: string`, `max: integer` — five categories, each max 100; a
  project's total is their average (out of 100).

### Model: `RoleOption` (config constant)
- **Fields:** `value: string`, `bucket: 'engineering' | 'design' | 'product' | 'domain'`
