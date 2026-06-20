# 10) Technical Flow and Code Structure

## 10.1 Logical Technical Flow

### Flow: Request lifecycle
1. React calls `/api/...` with the JWT (via `frontend/src/api.js`).
2. Express parses JSON; the route applies `authRequired` then any role guard.
3. The handler validates input and calls `db.js` (`run/get/all/insert`).
4. `db.js` runs against SQLite or Postgres depending on `DATABASE_URL`.
5. The handler returns JSON; errors hit the centralized error handler.

### Flow: Team matching run
1. Admin → `POST /api/matching/run`.
2. Load `matching_profiles` where `matched=0`; if none, reject.
3. `matchingEngine.matchProfiles` embeds plans (`llm.js`) and greedily forms teams of ≤4.
4. Persist `matched=1`, `group_id`, and a `matching_runs` row; return the teams.

### Flow: Project submission
1. User → `POST /api/projects`.
2. Validate name; add creator to participant list.
3. For each participant, check they're not already in `project_participants` (one project/person).
4. Insert the project and its participant/track/sponsor rows; return the detail.

### Flow: Judging
1. Judge → `GET /api/projects` (all, optional sponsor filter) → open a project.
2. `POST /api/judging/:id/score`: validate ranges, sum to `total`, upsert by (project, judge).
3. `GET /api/judging/:id/scores`: admin sees all rows; a judge sees their own + the average.

## 10.2 Backend File Structure
```text
backend/
  src/
    db.js               # SQLite/Postgres adapter (run/get/all/insert/exec)
    schema.js           # dialect-aware CREATE TABLE IF NOT EXISTS
    seed.js             # admin account + sample hackathon; runs migrations
    seedData.js         # direct-to-DB demo seeding (used by scripts/, no server needed)
    server.js           # createApp(): express app + route mounting + error handler
    index.js            # entry point: load env, createApp, ensureSeed, listen
    constants.js        # SCORE_CRITERIA, ROLE_OPTIONS, roleBucket()
    middleware/auth.js  # signToken, authRequired, adminRequired, judgeRequired
    routes/
      auth.js           # register, login, me
      admin.js          # config, tracks, sponsors, users (incl. add/remove/grant judge)
      matching.js       # profile, me, profiles, groups, runs, run
      projects.js       # create, list, detail
      judging.js        # criteria, score (upsert), scores
      meta.js           # public meta, user directory
    services/
      llm.js            # embedTexts (OpenAI or offline), cosineSimilarity
      matchingEngine.js # matchProfiles (greedy, diversity-aware)
  tests/                # node:test suites (positive + negative per workflow)
    helpers.js, auth.test.js, admin.test.js, matching.test.js,
    projects.test.js, judging.test.js
```

## 10.3 Frontend File Structure
```text
frontend/
  index.html
  vite.config.js        # dev proxy /api -> :4000
  src/
    main.jsx            # mount + BrowserRouter + AuthProvider
    App.jsx             # routes + Protected guard
    api.js              # fetch wrapper + token storage
    auth.jsx            # AuthProvider/useAuth (login/register/logout, role flags)
    styles.css
    components/Nav.jsx, MultiSelect.jsx
    pages/Login.jsx, Register.jsx, Dashboard.jsx, TeamMatching.jsx,
          Submission.jsx, Judging.jsx, AdminPanel.jsx
```

## 10.4 File and Method Catalog

### File: `backend/src/db.js`
- **Purpose:** Single data-access boundary; picks SQLite or Postgres by `DATABASE_URL`.
#### Method: `run(sql, params)`
- **Input:** SQL string with `?` placeholders, params array · **Output:** `Promise<void>`
- **Description:** `# execute a write/DDL statement on the active engine`
#### Method: `get(sql, params)` / `all(sql, params)`
- **Input:** SQL + params · **Output:** `Promise<row>` / `Promise<row[]>`
- **Description:** `# fetch one row / all rows`
#### Method: `insert(table, data)`
- **Input:** table name, column→value object · **Output:** `Promise<number>` (new id)
- **Description:** `# insert a row and return its generated id (RETURNING on PG)`

### File: `backend/src/middleware/auth.js`
#### Method: `signToken(user)`
- **Input:** `{id,email,role}` · **Output:** JWT string · **Description:** `# issue a 7-day token`
#### Method: `authRequired(req,res,next)`
- **Input:** request · **Output:** sets `req.user` or 401 · **Description:** `# verify token, load fresh user`
#### Method: `adminRequired` / `judgeRequired`
- **Input:** request (after authRequired) · **Output:** next() or 403
- **Description:** `# gate by role / judge flag`

### File: `backend/src/services/matchingEngine.js`
#### Method: `matchProfiles(profiles)`
- **Input:** unmatched profiles `[{id,user_id,role,plan_to_build,tracks,sponsors}]`
- **Output:** `Promise<Profile[][]>` (teams of ≤4)
- **Description:** `# embed plans, greedily form diversity-aware teams`

### File: `backend/src/services/llm.js`
#### Method: `embedTexts(texts)`
- **Input:** `string[]` · **Output:** `Promise<number[][]>`
- **Description:** `# OpenAI embeddings, or deterministic offline vectors as fallback`
#### Method: `cosineSimilarity(a,b)`
- **Input:** two vectors · **Output:** number · **Description:** `# cosine similarity`

### File: `frontend/src/auth.jsx`
#### Method: `AuthProvider` / `useAuth()`
- **Input:** children / — · **Output:** context with `{user,login,register,logout,isAdmin,isJudge}`
- **Description:** `# holds session, restores from token, exposes role flags`
