# 6) POJO / Domain Models

This codebase is plain JavaScript with no ORM classes; the "models" are the row shapes returned
by the data layer plus the in-memory shapes used by the matching engine. Fields listed below.

### Model: `User`
- **Fields:**
  - `id: integer`
  - `email: string`
  - `linkedin: string`
  - `role: 'user' | 'admin'`
  - `is_judge: 0 | 1`
  - `created_at: string (ISO)`
  - `password_hash: string` (server-only; never returned to the client)

### Model: `Config`
- **Fields:** `id: 1`, `hackathon_name: string`, `details: string`

### Model: `Track` / `Sponsor`
- **Fields:** `id: integer`, `name: string`

### Model: `MatchingProfile`
- **Fields:**
  - `id: integer`
  - `user_id: integer`
  - `role: string`
  - `plan_to_build: string`
  - `tracks: integer[]` (parsed from JSON text)
  - `sponsors: integer[]` (parsed from JSON text)
  - `matched: 0 | 1`
  - `group_id: integer | null`
  - `created_at: string`

### Model: `MatchingRun`
- **Fields:** `id: integer`, `created_at: string`, `group_count: integer`,
  `people_count: integer`

### Model: `Project` (detail shape returned by the API)
- **Fields:**
  - `id: integer`
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
  - `presentation: integer (0–20)`
  - `technical: integer (0–20)`
  - `code_quality: integer (0–15)`
  - `functionality: integer (0–15)`
  - `innovation: integer (0–15)`
  - `ux: integer (0–15)`
  - `total: integer (0–100)`
  - `comments: string`

### Model: `ScoreCriterion` (config constant, `backend/src/constants.js`)
- **Fields:** `key: string`, `label: string`, `max: integer` — the six criteria sum to 100.

### Model: `RoleOption` (config constant)
- **Fields:** `value: string`, `bucket: 'engineering' | 'design' | 'product' | 'domain'`
