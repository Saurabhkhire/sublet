# 11) Test Cases

All automated tests live in `backend/tests/` and run with `npm test` (repo root) →
**40 tests, all passing**. Each row traces to a §4 UI Page + Workflow. "API positive/negative"
names the concrete test; "UI positive/negative" describes the manual screen behavior covered by
the same rule.

## 11.1 Test case matrix (by UI Page + Workflow)

### `Register` — Workflow 1: Create account
- **UI positive:** Valid email + 6+ char password → lands on Dashboard logged in.
- **UI negative:** Bad email / short password / taken email → inline error, stays on page.
- **API positive:** `auth.test.js` — "creates account and returns token".
- **API negative:** `auth.test.js` — invalid email (400), short password (400), duplicate (409).

### `Login` — Workflow 1: Log in
- **UI positive:** Correct credentials → Dashboard with role-appropriate nav.
- **UI negative:** Wrong password → "Invalid email or password".
- **API positive:** `auth.test.js` — "valid credentials succeed"; "admin account works".
- **API negative:** `auth.test.js` — "wrong password rejected" (401).

### `Login` — Workflow 2: Stay logged in across reloads
- **UI positive:** Refresh keeps you logged in.
- **UI negative:** Tampered/absent token returns to Login.
- **API positive:** `auth.test.js` — "admin account works" then `GET /me` returns role.
- **API negative:** `auth.test.js` — "no token is unauthorised" (401).

### `Admin Panel` — Workflow 1: Edit hackathon details
- **UI positive:** Save new name/details → "Saved!", reflected on Dashboard.
- **UI negative:** Non-admin never sees the page.
- **API positive:** `admin.test.js` — "admin updates hackathon name & details".
- **API negative:** `admin.test.js` — "non-admin cannot update" (403).

### `Admin Panel` — Workflow 2 & 3: Manage tracks / sponsors
- **UI positive:** Add/rename/delete updates the list immediately.
- **UI negative:** Empty name is rejected.
- **API positive:** `admin.test.js` — "create multiple tracks"; "create and delete" sponsor.
- **API negative:** `admin.test.js` — "empty name rejected" (400).

### `Admin Panel` — Workflow 4: Manage user access
- **UI positive:** Toggle flips a user's "Can view & judge".
- **UI negative:** Admin row is fixed and cannot be toggled off into a non-judge.
- **API positive:** `admin.test.js` — "admin grants judge permission".
- **API negative:** `admin.test.js` — "non-admin cannot list users" (403).

### `Admin Panel` — Workflow 5: Add a user
- **UI positive:** New user appears in the table.
- **UI negative:** Duplicate email shows an error.
- **API positive:** `admin.test.js` — "admin adds a new user" (201).
- **API negative:** covered by the unique-email rule (409) on duplicate add.

### `Admin Panel` — Workflow 6: Remove a user
- **UI positive:** User disappears after confirm.
- **UI negative:** Removing the admin is blocked.
- **API positive:** `admin.test.js` — "admin removes a user".
- **API negative:** `admin.test.js` — "admin account cannot be removed" (400).

### `Team Matching` — Workflow 1: Opt into / update profile
- **UI positive:** Save profile → success note; editable until matched.
- **UI negative:** Missing role/plan blocked; locked once matched.
- **API positive:** `matching.test.js` — "user opts into matching"; "matched user sees group".
- **API negative:** `matching.test.js` — "missing role/plan rejected" (400); "already-matched
  user cannot edit" (409); "non-admin cannot list opt-ins" (403).

### `Admin Panel` — Workflow 7: Run team matching
- **UI positive:** "Run matching" forms teams of ≤4 and shows them; counts update.
- **UI negative:** Button disabled / rejected when nobody new is waiting.
- **API positive:** `matching.test.js` — "groups of ≤4, all placed"; "only NEW opt-ins matched
  on a second run".
- **API negative:** `matching.test.js` — "re-running with no new opt-ins is rejected" (400).

### `Submit Project` — Workflow 1: Submit a project
- **UI positive:** Submit → "Project submitted!", appears under My Projects (creator included).
- **UI negative:** No name, or a member already on another project → error, nothing saved.
- **API positive:** `projects.test.js` — "submission with participants/tracks/sponsors".
- **API negative:** `projects.test.js` — "missing name rejected" (400); "participant already on
  another project" (409).

### `Submit Project` — Workflow 2 / `Judging` — Workflow 1: List & filter projects
- **UI positive:** Normal user sees only their project; judge sees all and can filter by sponsor.
- **UI negative:** Unrelated non-judge cannot open someone else's project.
- **API positive:** `projects.test.js` — "judge sees all"; "user sees only their own";
  "judge filters by sponsor".
- **API negative:** `projects.test.js` — "unrelated non-judge cannot view a project" (403).

### `Judging` — Workflow 2: Score a project
- **UI positive:** Enter six criteria (live total /100) + comments → "Score saved!"; admin sees
  all scores + average.
- **UI negative:** Out-of-range value blocked; non-judge has no access.
- **API positive:** `judging.test.js` — "criteria sum to 100"; "judge scores, total computed";
  "re-scoring updates"; "admin sees aggregate average".
- **API negative:** `judging.test.js` — "non-judge cannot score" (403); "out-of-range rejected"
  (400); "outsider cannot read scores" (403).

## 11.2 Detailed test case format (example)

### Test Case ID: `TC-001`
- **Title:** Reject project submission when a member is already on another project
- **UI Page (§4):** Submit Project
- **Workflow (§4):** Workflow 1 — Submit a project
- **Type:** API
- **Preconditions:** User B is already a participant on an existing project.
- **Steps:**
  1. Authenticate as User C.
  2. Submit a new project including User B as a participant.
  3. Read the response.
- **Expected result:** HTTP 409 with a message naming User B; no project created.
- **Actual result:** HTTP 409, message "These participants are already part of another
  project: b@example.com".
- **Status:** Pass

### Test Case ID: `TC-002`
- **Title:** Second matching run groups only newcomers
- **UI Page (§4):** Admin Panel
- **Workflow (§4):** Workflow 7 — Run team matching
- **Type:** API
- **Preconditions:** Five people were matched in a first run; two new people then opt in.
- **Steps:**
  1. Authenticate as admin.
  2. Trigger a matching run.
  3. Sum the members across returned groups.
- **Expected result:** Total members = 2 (only the newcomers), existing teams untouched.
- **Actual result:** Total = 2.
- **Status:** Pass

## 11.3 Running the tests
```bash
npm test        # repo root → backend suite; expected: tests 40 · pass 40 · fail 0
```
