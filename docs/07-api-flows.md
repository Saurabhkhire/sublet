# 7) API Flows

Base path `/api`. Auth is a Bearer JWT. "Admin" = `role=admin`. "Judge" = admin **or** a member
of `hackathon_judges` for that hackathon. Most resources are nested under
`/api/hackathons/:hid/…` and scoped to that hackathon. Related UI names refer to
[§4](04-ui-pages-and-workflows.md).

## Auth
- `POST /api/auth/register` — `{email, password, linkedin?}` → `{token, user}`. `400` invalid
  email / short password; `409` email exists. (Register / Workflow 1)
- `POST /api/auth/login` — `{email, password}` → `{token, user}`. `401` invalid. (Login / WF 1)
- `GET /api/auth/me` — current user. `401` if no/invalid token. (Login / WF 2)

## Global meta & users
- `GET /api/meta` — `{roles:[…], score_criteria:[…]}` (global constants).
- `GET /api/meta/users` — auth; `[{id,email}]` directory for picking participants.
- `GET /api/admin/users` — admin; list global accounts.
- `POST /api/admin/users` — admin; `{email,password,linkedin?}` → `201` / `409`.
- `DELETE /api/admin/users/:id` — admin; removes user + their participations/profiles/scores.
  `400` for the admin account. (Users page)

## Hackathons
- `GET /api/hackathons` — auth; list with `{project_count, judge_count, is_judge}`.
  (Hackathons / WF 1)
- `POST /api/hackathons` — admin; `{name, details}` → created hackathon. `400` empty name;
  `403` non-admin. (Hackathons / WF 2)
- `GET /api/hackathons/:hid` — auth; meta:
  `{hackathon, tracks, sponsors, roles, score_criteria, is_judge, is_admin}`. `404` unknown.
- `PUT /api/hackathons/:hid` — admin; `{name, details}`. (Admin / WF 1)
- `POST /api/hackathons/:hid/reset` — admin; deletes all projects + judging scores for the
  hackathon → `{deleted_projects}`. (Admin / Reset)
- `DELETE /api/hackathons/:hid` — admin; deletes the hackathon and all its data.

### Tracks / Sponsors (per hackathon)
- `GET /api/hackathons/:hid/tracks` — auth. `POST` / `PUT /:id` / `DELETE /:id` — admin,
  body `{name}`; `400` empty. Same shape for `…/sponsors`. (Admin / WF 2–3)

### Judges (per hackathon)
- `GET /api/hackathons/:hid/judges` — admin; assigned judges.
- `POST /api/hackathons/:hid/judges` — admin; `{user_id}` grants view+judge. `404` no user.
- `DELETE /api/hackathons/:hid/judges/:userId` — admin; revokes. (Admin / Judges)

### Matching (per hackathon)
- `POST /api/hackathons/:hid/matching/profile` — auth; `{role, plan_to_build, tracks[], sponsors[]}`.
  `400` missing role/plan; `409` already matched. (Team Matching / WF 1)
- `GET /api/hackathons/:hid/matching/me` — auth; `{profile, group}`.
- `GET /api/hackathons/:hid/matching/profiles|groups|runs` — admin views.
- `POST /api/hackathons/:hid/matching/run` — admin; matches unmatched profiles only →
  `{run_id, groups:[{group_id, members:[{user_id, role}]}]}`. `400` if none waiting.
  (Admin / WF 7)

### Projects (per hackathon)
- `POST /api/hackathons/:hid/projects` — auth; `{name, short_description, demo_video_link,
  git_link, participants[], tracks[], sponsors[]}`. Creator auto-added. `400` no name; `409`
  participant already on another project in this hackathon. (Submit Project / WF 1)
- `GET /api/hackathons/:hid/projects?sponsor=<id>` — auth; judges/admins see all (optional
  sponsor filter), others see only their own. (Submit / WF 2, Judging / WF 1)
- `GET /api/hackathons/:hid/projects/:projectId` — auth; judge/admin or a participant. `403` /
  `404`.

### Judging (per hackathon, under projects)
- `POST /api/hackathons/:hid/projects/:projectId/score` — judge; the six criteria + `comments`;
  atomic upsert → `{total}`. `400` out of range; `403` not a judge; `404` project. (Judging / WF 2)
- `GET /api/hackathons/:hid/projects/:projectId/scores` — judge; `{scores, mine, average,
  judge_count}` (admin sees all rows; a judge sees only their own).

### API Sequence Diagram (Text)
```text
Client -> Express route -> authRequired (JWT) -> hackathonContext (loads hackathon + isJudge)
       -> role guard (adminOnly / judgeRequired) -> db.js (SQLite/Neon)
       -> [matching] matchingEngine.js -> llm.js (gpt-4o-mini | fallback)
       -> JSON -> Client
```
