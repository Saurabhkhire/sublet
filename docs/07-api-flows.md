# 7) API Flows

Base path `/api`. Auth is a Bearer JWT. "Admin" = `role=admin`. "Judge" = admin **or** a member
of `hackathon_judges` for that hackathon. Most resources are nested under
`/api/hackathons/:hid/…` and scoped to that hackathon. Related UI names refer to
[§4](04-ui-pages-and-workflows.md).

## Auth
- `POST /api/auth/register` — `{email, password, linkedin}` (all required) → `{token, user}`.
  `400` invalid email / short password / missing LinkedIn; `409` email exists. (Register / WF 1)
- `POST /api/auth/login` — `{email, password}` → `{token, user}`. `401` invalid. (Login / WF 1)
- `GET /api/auth/me` — current user. `401` if no/invalid token. (Login / WF 2)
- `PUT /api/auth/profile` — auth; `{linkedin?, password?}` updates the caller's own LinkedIn
  and/or password → `{user}`. `400` empty LinkedIn / password < 6 / nothing to update; `401` if
  not signed in. (Account settings)

## Global meta & users
- `GET /api/meta` — `{roles:[…], score_criteria:[…]}` (global constants).
- `GET /api/meta/users` — auth; `[{id,email}]` directory (non-admin users only). Supports
  optional `?search=<query>` typeahead — returns ≤ 20 users whose email contains the query
  (used by the Submit Project team-member search input). (Submit Project / WF 1)
- `GET /api/admin/users` — admin; list all accounts ordered by email. Supports optional
  `?search=<query>` for typeahead — returns ≤ 20 users whose email contains the query (used by
  the judges and project-participants search inputs). (Admin / WF 4, WF 8)
- `POST /api/admin/users` — admin; `{email,password,linkedin?}` → `201` / `409`.
- `DELETE /api/admin/users/:id` — admin; removes user + their participations/profiles/scores.
  `400` for the admin account. (Users page)
- `DELETE /api/admin/users` — admin; deletes **all** non-admin users and their data, plus any
  project left with no participants → `{deleted_users, deleted_projects}`. (Users / Delete all)

## Hackathons
- `GET /api/hackathons` — auth; list with `{project_count, judge_count, is_judge}`.
  (Hackathons / WF 1)
- `POST /api/hackathons` — admin; `{name, details, support_info?, schedule?, event_date?,
  start_time?, end_time?, location?}` → created hackathon. `event_date` (YYYY-MM-DD) gates project
  submission to that day. `400` empty name; `403` non-admin. (Hackathons / WF 2)
- `GET /api/hackathons/:hid` — auth; meta:
  `{hackathon (incl. support_info, schedule, event_date, start_time, end_time, location), tracks
  (incl. description), sponsors (incl. description, access_instructions, prizes),
  judges:[{id,email,linkedin}], roles, score_criteria, is_judge, is_admin}`. `404` unknown.
- `PUT /api/hackathons/:hid` — admin; `{name, details, support_info?, schedule?, event_date?,
  start_time?, end_time?, location?}`. (Admin / WF 1)
- `POST /api/hackathons/:hid/reset` — admin; deletes all projects + judging scores for the
  hackathon → `{deleted_projects}`. (Admin / Reset)
- `DELETE /api/hackathons/:hid` — admin; deletes the hackathon and all its data.

### Tracks / Sponsors (per hackathon)
- `GET /api/hackathons/:hid/tracks` — auth. `POST` / `PUT /:id` / `DELETE /:id` — admin,
  body `{name, description?}`; `400` empty name. (Admin / WF 2)
- `GET /api/hackathons/:hid/sponsors` — auth. `POST` / `PUT /:id` / `DELETE /:id` — admin,
  body `{name, description?, access_instructions?, prizes?}`; `400` empty name. (Admin / WF 3)

### Judges (per hackathon)
- `GET /api/hackathons/:hid/judges` — admin; assigned judges.
- `POST /api/hackathons/:hid/judges` — admin; `{user_id}` grants view+judge. `404` no user.
- `DELETE /api/hackathons/:hid/judges/:userId` — admin; revokes. (Admin / Judges)

### Matching (per hackathon)
- `POST /api/hackathons/:hid/matching/profile` — auth; `{role, plan_to_build, tracks[], sponsors[]}`.
  `400` missing role/plan; `409` already matched. (Team Matching / WF 1)
- `GET /api/hackathons/:hid/matching/me` — auth; `{profile, group}`.
- `GET /api/hackathons/:hid/matching/participants` — auth; visible to anyone who has opted in
  (or admin). Returns every opt-in's `{user_id, role, plan_to_build, tracks, sponsors, matched,
  group_id, email, linkedin}` so participants can find teammates. `403` if the caller hasn't
  opted in. (Team Matching / participants directory)
- `GET /api/hackathons/:hid/matching/profiles|groups|runs` — admin views.
- `POST /api/hackathons/:hid/matching/run` — admin; matches unmatched profiles only →
  `{run_id, groups:[{group_id, members:[{user_id, role}]}]}`. `400` if none waiting.
  (Admin / WF 7)

### Projects (per hackathon)
- `POST /api/hackathons/:hid/projects` — auth; `{name, short_description, demo_video_link,
  git_link, participants[], tracks[], sponsors[]}`. Creator auto-added. `400` no name; `403`
  if `event_date` is set and today (UTC) is before that date or more than one day after it
  (48-hour window: event date + following calendar day); `409` participant already on another
  project in this hackathon. (Submit Project / WF 1)
- `GET /api/hackathons/:hid/projects?sponsor=<id>` — auth; judges/admins see all (optional
  sponsor filter), others see only their own. Each project includes `average_score` (avg of all
  judges' totals, out of 100, or null), `judge_count`, `category_averages` (per-category averages
  for the Results view), `total_investment` (sum of every judge's investment) + `investor_count`,
  and — for judges — `my_score` and `my_investment` (the caller's own, or null).
  (Submit / WF 2, Judging / WF 1–3, Admin / WF 8)
- `GET /api/hackathons/:hid/projects/:projectId` — auth; judge/admin or a participant. `403` /
  `404`.
- `PUT /api/hackathons/:hid/projects/:projectId` — admin; `{name?, short_description?,
  demo_video_link?, git_link?, participants?:number[], tracks?:number[], sponsors?:number[]}`.
  Fully replaces each supplied list (omitting a key leaves that list unchanged). `400` blank name;
  `403` non-admin; `404` unknown. Returns updated project detail. (Admin / WF 8)
- `DELETE /api/hackathons/:hid/projects/:projectId` — admin; deletes one project and its
  participants/tracks/sponsors/scores. `403` non-admin; `404` unknown. (Admin / WF 8)

### Judging (per hackathon, under projects)
- `POST /api/hackathons/:hid/projects/:projectId/score` — judge; the five categories
  `{presentation, execution, innovation, impact, implementation}` (each 0–100), an optional
  `investment` (≥ 0, the judge's would-be investment), and `comments`; atomic upsert. `total` is
  the categories' **average** → `{total, investment}`. `400` category out of range or negative
  investment; `403` not a judge; `404` project. (Judging / WF 1)
- `GET /api/hackathons/:hid/projects/:projectId/scores` — judge; `{scores, mine, average,
  judge_count}` where `average` is the mean of all judges' totals (admin sees every row; a judge
  sees only their own).

### API Sequence Diagram (Text)
```text
Client -> Express route -> authRequired (JWT) -> hackathonContext (loads hackathon + isJudge)
       -> role guard (adminOnly / judgeRequired) -> db.js (SQLite/Neon)
       -> [matching] matchingEngine.js -> llm.js (gpt-4o-mini | fallback)
       -> JSON -> Client
```
