# 11) Test Cases

All automated tests live in `backend/tests/` and run with `npm test` (repo root) →
**71 tests, all passing**. Each row traces to a §4 UI Page + Workflow.

## 11.1 Test case matrix (by UI Page + Workflow)

### `Register` — Workflow 1: Create account
- **UI positive:** valid email + 6+ char password + LinkedIn → Hackathons, logged in.
- **UI negative:** bad email / short password / missing LinkedIn / taken email → inline error.
- **API positive:** `auth.test.js` — "creates account and returns token".
- **API negative:** `auth.test.js` — invalid email (400), short password (400), missing LinkedIn
  (400), duplicate (409).

### `Login` — Workflows 1 & 2: Log in / stay logged in
- **API positive:** `auth.test.js` — valid credentials; admin account; `/me` returns role.
- **API negative:** `auth.test.js` — wrong password (401); no token (401).

### `Users` — Workflows 1–3: Add / remove / delete-all (admin)
- **API positive:** `admin.test.js` — lists users; adds a user; removes a user; deletes all
  non-admin users (admin remains).
- **API negative:** `admin.test.js` — duplicate email (409); admin account cannot be removed
  (400); non-admin cannot list users (403); non-admin cannot delete all users (403).

### `Account settings` — Workflows 1 & 2: Update LinkedIn / change password
- **API positive:** `auth.test.js` — user updates their LinkedIn; user changes password and can
  log in with the new one (old one fails).
- **API negative:** `auth.test.js` — short password (400); empty LinkedIn (400); unauthenticated
  update (401).

### `Hackathons` — Workflows 1 & 2: Browse / create
- **UI positive:** cards list; admin creates and is taken to Admin.
- **UI negative:** non-admin can't create; empty name blocked.
- **API positive:** `hackathons.test.js` — admin creates; anyone lists + opens meta.
- **API negative:** `hackathons.test.js` — non-admin create (403); empty name (400); unknown
  hackathon (404).

### `Hackathon · Admin` — Workflow 1: Edit details
- **API positive:** `hackathons.test.js` — "admin edits details".

### `Hackathon · Admin` — Workflow 1: Edit details (incl. support & schedule)
- **API positive:** `hackathons.test.js` — admin edits details; creates & edits `support_info`
  + `schedule`.

### `Hackathon · Admin` — Workflows 2 & 3: Tracks / sponsors (with descriptions)
- **API positive:** `hackathons.test.js` — manages multiple entries; track carries a description;
  sponsor carries description + access instructions + prizes.
- **API negative:** `hackathons.test.js` — empty name (400); non-admin add (403).

### `Hackathon · Admin` — Workflow 4: Assign judges
- **API positive:** `hackathons.test.js` — grants/revokes view+judge access; the meta endpoint
  returns `judges` (with LinkedIn) for the Overview info display.

### `Hackathon · Team Matching` — Workflow 1: Opt in
- **API positive:** `matching.test.js` — opts in; matched user sees group.
- **API negative:** `matching.test.js` — missing role/plan (400); already-matched edit (409);
  non-admin lists opt-ins (403).

### `Hackathon · Team Matching` — Workflow 2: Browse other participants
- **API positive:** `matching.test.js` — an opted-in user sees other participants' profiles
  (role + plan + contact).
- **API negative:** `matching.test.js` — a user who hasn't opted in is refused (403).

### `Hackathon · Admin` — Workflow 5: Run team matching
- **API positive:** `matching.test.js` — groups of ≤4, all placed; second run matches only new
  opt-ins; matching is scoped per hackathon (isolation).
- **API negative:** `matching.test.js` — re-running with no new opt-ins (400).

### `Hackathon · Submit Project` — Workflows 1 & 2: Submit / list
- **API positive:** `projects.test.js` — submission with participants/tracks/sponsors; user sees
  only own; same person can join a project in a different hackathon (isolation); submission on a
  hackathon whose `event_date` is today succeeds (201).
- **API negative:** `projects.test.js` — missing name (400); participant already on another
  project in this hackathon (409); unrelated non-judge cannot view details (403); submission to a
  hackathon whose `event_date` is not today is rejected (403, submission window closed).

### `Hackathon · Judging` — Workflow 1: Score a project (Score tab)
- **API positive:** `judging.test.js` — meta exposes 5 categories each /100; judge scores and the
  total is the **average** of the five; re-scoring updates; `projects.test.js` — filter by sponsor.
- **API negative:** `judging.test.js` — non-judge cannot score (403); out-of-range value, e.g.
  150 (400); outsider cannot read scores (403).

### `Hackathon · Judging` — Workflow 2: Results & averages (Results tab)
- **API positive:** `judging.test.js` — projects list exposes `average_score`, `judge_count`,
  per-category `category_averages`, and the caller's own `my_score`; admin sees the aggregate
  average across judges.

### `Hackathon · Judging` — Workflow 3: Investments (Investments tab)
- **API positive:** `judging.test.js` — a judge's investment is stored; project list exposes
  `total_investment`, `investor_count`, and the caller's `my_investment`.
- **API negative:** `judging.test.js` — a negative investment is rejected (400).

### `Hackathon · Admin` — Workflow 6: Reset projects & judging
- **API positive:** `hackathons.test.js` — "admin clears all projects + judge data".
- **API negative:** `hackathons.test.js` — non-admin cannot reset (403).

### Demo seeding (tooling, `seedData.test.js`)
- **Positive:** creates users and projects directly in the DB (no server), idempotently.

### Concurrency (cross-cutting, `concurrency.test.js`)
- **Positive:** racing submissions for the same participant → exactly one wins, no orphan;
  same judge scoring twice at once → one score row (atomic upsert).

## 11.2 Detailed test case (example)

### Test Case ID: `TC-010`
- **Title:** Reset deletes all projects and judging for a hackathon
- **UI Page (§4):** Hackathon · Admin · **Workflow 6 — Reset projects & judging**
- **Type:** API
- **Preconditions:** a hackathon with at least one submitted project.
- **Steps:** 1. Authenticate as admin. 2. Call reset for the hackathon. 3. List projects.
- **Expected result:** reset returns the deleted count; the projects list is empty.
- **Actual result:** matches expected.
- **Status:** Pass

## 11.3 Running
```bash
npm test        # repo root → backend suite; expected: tests 71 · pass 71 · fail 0
```
