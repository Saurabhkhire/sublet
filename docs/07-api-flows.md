# 7) API Flows

Base path `/api`. Auth is a Bearer JWT in the `Authorization` header. "Admin" = `role=admin`;
"Judge" = `is_judge=1` or admin. Related UI page names refer to [§4](04-ui-pages-and-workflows.md).

---

### Endpoint: `POST /api/auth/register`
- **Purpose:** Create a participant account and return a token.
- **Auth Required:** No
- **Request Payload:**
```json
{ "email": "you@example.com", "password": "secret123", "linkedin": "https://..." }
```
- **Response Payload:**
```json
{ "token": "jwt...", "user": { "id": 2, "email": "you@example.com", "role": "user", "is_judge": 0, "linkedin": "" } }
```
- **Validation Rules:** valid email; password ≥ 6; email unique.
- **Error Codes:** `400` invalid email / short password; `409` email exists.
- **Related UI Actions:** Register / Workflow 1.

### Endpoint: `POST /api/auth/login`
- **Purpose:** Authenticate and return a token.
- **Auth Required:** No
- **Request Payload:** `{ "email": "...", "password": "..." }`
- **Response Payload:** `{ "token": "jwt...", "user": { ... } }`
- **Validation Rules:** both fields present; credentials match.
- **Error Codes:** `400` missing fields; `401` invalid credentials.
- **Related UI Actions:** Login / Workflow 1.

### Endpoint: `GET /api/auth/me`
- **Purpose:** Return the current user for session restore.
- **Auth Required:** Yes
- **Response Payload:** `{ "user": { "id", "email", "linkedin", "role", "is_judge" } }`
- **Error Codes:** `401` missing/invalid token.
- **Related UI Actions:** Login / Workflow 2.

---

### Endpoint: `GET /api/meta`
- **Purpose:** Public hackathon info + tracks + sponsors + role options + score criteria (for forms).
- **Auth Required:** No
- **Response Payload:**
```json
{ "config": {"hackathon_name":"...","details":"..."}, "tracks":[{"id":1,"name":"AI"}],
  "sponsors":[{"id":1,"name":"OpenAI"}], "roles":["Backend Engineer", "..."],
  "score_criteria":[{"key":"presentation","label":"...","max":20}] }
```
- **Related UI Actions:** Dashboard, Team Matching, Submit Project, Judging.

### Endpoint: `GET /api/meta/users`
- **Purpose:** Minimal user directory (id + email) for picking project participants.
- **Auth Required:** Yes · **Response:** `[{ "id": 2, "email": "a@b.com" }]`
- **Related UI Actions:** Submit Project / Workflow 1.

---

### Endpoint group: Admin config / tracks / sponsors (`/api/admin/*`)
- **Auth Required:** Yes (admin). Non-admin → `403`.
- `GET /api/admin/config` → `{ hackathon_name, details }`
- `PUT /api/admin/config` body `{ hackathon_name, details }` → updated config.
- `GET|POST /api/admin/tracks`, `PUT|DELETE /api/admin/tracks/:id` — POST/PUT body `{ name }`.
- `GET|POST /api/admin/sponsors`, `PUT|DELETE /api/admin/sponsors/:id` — body `{ name }`.
- **Error Codes:** `400` empty name; `403` not admin.
- **Related UI Actions:** Admin Panel / Workflows 1–3.

### Endpoint group: Admin users (`/api/admin/users`)
- **Auth Required:** Yes (admin).
- `GET /api/admin/users` → list with `role`, `is_judge`.
- `POST /api/admin/users` body `{ email, password, linkedin?, is_judge? }` → `201` or `409` if email exists.
- `PATCH /api/admin/users/:id` body `{ is_judge: true|false }` → grant/revoke judge access.
- `DELETE /api/admin/users/:id` → removes user (cleans up participants/profiles/scores).
- **Error Codes:** `400` admin account cannot be removed; `404` user not found; `403` not admin.
- **Related UI Actions:** Admin Panel / Workflows 4–6.

---

### Endpoint: `POST /api/matching/profile`
- **Purpose:** Create/update the caller's matching profile.
- **Auth Required:** Yes
- **Request Payload:** `{ "role": "Backend Engineer", "plan_to_build": "...", "tracks": [1,2], "sponsors": [1] }`
- **Response Payload:** `{ "ok": true, "created": true }` or `{ "ok": true, "updated": true }`
- **Validation Rules:** role + plan required; cannot edit once matched.
- **Error Codes:** `400` missing role/plan; `409` already matched.
- **Related UI Actions:** Team Matching / Workflow 1.

### Endpoint: `GET /api/matching/me`
- **Purpose:** Caller's profile + assigned group members.
- **Auth Required:** Yes · **Response:** `{ "profile": {...}|null, "group": [{ id,email,linkedin,role,plan_to_build }] }`
- **Related UI Actions:** Dashboard / Workflow 1, Team Matching.

### Endpoint: `GET /api/matching/profiles` · `GET /api/matching/groups` · `GET /api/matching/runs`
- **Purpose:** Admin views of all opt-ins, formed teams, and run history.
- **Auth Required:** Yes (admin). Non-admin → `403`.
- **Related UI Actions:** Admin Panel / Workflow 8.

### Endpoint: `POST /api/matching/run`
- **Purpose:** Trigger matching for unmatched profiles only.
- **Auth Required:** Yes (admin)
- **Response Payload:**
```json
{ "run_id": 1, "groups": [ { "group_id": 1000, "members": [ { "user_id": 2, "role": "..." } ] } ] }
```
- **Validation Rules:** at least one unmatched profile must exist.
- **Error Codes:** `400` no new opt-ins; `403` not admin.
- **Related UI Actions:** Admin Panel / Workflow 7.

---

### Endpoint: `POST /api/projects`
- **Purpose:** Submit a project; creator auto-added; enforces one-project-per-person.
- **Auth Required:** Yes
- **Request Payload:**
```json
{ "name": "AI Notes", "short_description": "...", "demo_video_link": "https://...",
  "git_link": "https://github.com/...", "participants": [3,4], "tracks": [1], "sponsors": [1] }
```
- **Response Payload:** full project detail (with `participants`, `tracks`, `sponsors`).
- **Validation Rules:** name required; no participant already on another project.
- **Error Codes:** `400` missing name; `409` participant conflict.
- **Related UI Actions:** Submit Project / Workflow 1.

### Endpoint: `GET /api/projects?sponsor=<id>`
- **Purpose:** List projects. Judges/admins see all (optional sponsor filter); normal users see
  only their own.
- **Auth Required:** Yes · **Response:** array of project details.
- **Related UI Actions:** Submit Project / Workflow 2, Judging / Workflow 1.

### Endpoint: `GET /api/projects/:id`
- **Purpose:** Project detail.
- **Auth Required:** Yes (judge/admin, or a participant of that project)
- **Error Codes:** `403` not allowed; `404` not found.
- **Related UI Actions:** Judging / Workflow 1.

---

### Endpoint: `GET /api/judging/criteria`
- **Purpose:** The six scoring criteria + max total (100).
- **Auth Required:** Yes (judge/admin) · **Response:** `{ "criteria":[...], "max_total":100 }`
- **Related UI Actions:** Judging / Workflow 2.

### Endpoint: `POST /api/judging/:projectId/score`
- **Purpose:** Create/update the caller-judge's score for a project.
- **Auth Required:** Yes (judge/admin)
- **Request Payload:** `{ "presentation":18, "technical":17, "code_quality":13, "functionality":14, "innovation":12, "ux":13, "comments":"..." }`
- **Response Payload:** `{ "ok": true, "total": 87 }`
- **Validation Rules:** each criterion within 0..its max.
- **Error Codes:** `400` out-of-range value; `403` not a judge; `404` project not found.
- **Related UI Actions:** Judging / Workflow 2.

### Endpoint: `GET /api/judging/:projectId/scores`
- **Purpose:** Scores for a project. Admin sees all judges' rows; a judge sees only their own.
  Both get the average and judge count.
- **Auth Required:** Yes (judge/admin)
- **Response Payload:** `{ "scores":[...], "mine":{...}|null, "average":86.5, "judge_count":2 }`
- **Error Codes:** `403` not a judge.
- **Related UI Actions:** Judging / Workflow 2.

---

### API Sequence Diagram (Text)
```text
Client -> Express route -> auth middleware (JWT + role) -> db.js (SQLite/Neon)
       -> [matching only] matchingEngine.js -> llm.js (embeddings) -> back
       -> JSON response -> Client
```
