# 11) Test Cases

All automated tests live in `backend/tests/` and run with `npm test` (repo root) →
**51 tests, all passing**. Each row traces to a §4 UI Page + Workflow.

## 11.1 Test case matrix (by UI Page + Workflow)

### `Register` — Workflow 1: Create account
- **UI positive:** valid email + 6+ char password → Hackathons, logged in.
- **UI negative:** bad email / short password / taken email → inline error.
- **API positive:** `auth.test.js` — "creates account and returns token".
- **API negative:** `auth.test.js` — invalid email (400), short password (400), duplicate (409).

### `Login` — Workflows 1 & 2: Log in / stay logged in
- **API positive:** `auth.test.js` — valid credentials; admin account; `/me` returns role.
- **API negative:** `auth.test.js` — wrong password (401); no token (401).

### `Users` — Workflows 1 & 2: Add / remove user (admin)
- **API positive:** `admin.test.js` — lists users; adds a user; removes a user.
- **API negative:** `admin.test.js` — duplicate email (409); admin account cannot be removed
  (400); non-admin cannot list users (403).

### `Hackathons` — Workflows 1 & 2: Browse / create
- **UI positive:** cards list; admin creates and is taken to Admin.
- **UI negative:** non-admin can't create; empty name blocked.
- **API positive:** `hackathons.test.js` — admin creates; anyone lists + opens meta.
- **API negative:** `hackathons.test.js` — non-admin create (403); empty name (400); unknown
  hackathon (404).

### `Hackathon · Admin` — Workflow 1: Edit details
- **API positive:** `hackathons.test.js` — "admin edits details".

### `Hackathon · Admin` — Workflows 2 & 3: Tracks / sponsors
- **API positive:** `hackathons.test.js` — "admin manages multiple entries".
- **API negative:** `hackathons.test.js` — empty name (400); non-admin add (403).

### `Hackathon · Admin` — Workflow 4: Assign judges
- **API positive:** `hackathons.test.js` — "admin grants and revokes view/judge access".

### `Hackathon · Team Matching` — Workflow 1: Opt in
- **API positive:** `matching.test.js` — opts in; matched user sees group.
- **API negative:** `matching.test.js` — missing role/plan (400); already-matched edit (409);
  non-admin lists opt-ins (403).

### `Hackathon · Admin` — Workflow 5: Run team matching
- **API positive:** `matching.test.js` — groups of ≤4, all placed; second run matches only new
  opt-ins; matching is scoped per hackathon (isolation).
- **API negative:** `matching.test.js` — re-running with no new opt-ins (400).

### `Hackathon · Submit Project` — Workflows 1 & 2: Submit / list
- **API positive:** `projects.test.js` — submission with participants/tracks/sponsors; user sees
  only own; same person can join a project in a different hackathon (isolation).
- **API negative:** `projects.test.js` — missing name (400); participant already on another
  project in this hackathon (409); unrelated non-judge cannot view details (403).

### `Hackathon · Judging` — Workflows 1 & 2: Filter / score
- **API positive:** `judging.test.js` — criteria sum to 100; judge scores (total computed);
  re-scoring updates; admin sees aggregate average; `projects.test.js` — filter by sponsor.
- **API negative:** `judging.test.js` — non-judge cannot score (403); out-of-range (400);
  outsider cannot read scores (403).

### `Hackathon · Admin` — Workflow 6: Reset projects & judging
- **API positive:** `hackathons.test.js` — "admin clears all projects + judge data".
- **API negative:** `hackathons.test.js` — non-admin cannot reset (403).

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
npm test        # repo root → backend suite; expected: tests 51 · pass 51 · fail 0
```
