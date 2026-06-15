# Hackathon Platform

Project submission, team matching and judging for a hackathon.

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite locally (built into Node — no native build), Neon/Postgres when deployed
- **LLM:** OpenAI embeddings for team-matching similarity (with an offline fallback)

## Features

- **Register / Login** with email, password, LinkedIn (JWT auth).
- **Admin account** (default `admin123` / `admin123`, configurable via `ADMIN_EMAIL` /
  `ADMIN_PASSWORD`) with full control: edit hackathon name &
  details, manage Tracks and Sponsors (multiple entries), add/remove users, and choose who
  can view & judge projects.
- **Team matching (optional):** people pick role, tracks, sponsors and describe what they
  plan to build. Admin triggers matching into teams of ≤ 4, scored on track/sponsor overlap,
  AI similarity of the idea, and **role diversity**. Re-running only matches new people.
- **Project submission:** name, description, demo video, git link, team members, sponsors,
  tracks. Each person can be on **only one** project.
- **Judging:** selected judges score projects across 6 criteria (total /100) with comments,
  and can filter projects by sponsor. Admin sees all scores and averages.
- **Docs:** full §1–§13 product docs in [`docs/`](docs/README.md) (architecture, UI workflows,
  DB, API, tests, change log) per the rules in [`project.md`](project.md).
- **Tests:** positive **and** negative test case for every workflow (40 tests).

## Quick start

```bash
# 1. Install everything (root + backend + frontend)
npm run install:all

# 2. (optional) configure backend env
cp backend/.env.example backend/.env      # set OPENAI_API_KEY / DATABASE_URL if you have them

# 3. Seed the database (creates the admin account + sample tracks/sponsors)
npm run seed

# 4. Run backend + frontend together (ONE command)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Log in as **admin123 / admin123** for the admin panel, or register a normal account.

> The backend auto-seeds the admin account and config on every boot, so step 3 is optional.

## One command to run everything

`npm run dev` (from the repo root) launches the Express backend and the Vite dev server
together using `concurrently`. The Vite dev server proxies `/api/*` to the backend.

## Configuration (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `JWT_SECRET` | dev fallback | **set in production** |
| `ADMIN_EMAIL` | `admin123` | seeded admin login (configurable) |
| `ADMIN_PASSWORD` | `admin123` | seeded admin password (configurable) |
| `DATABASE_URL` | empty → SQLite | set to a `postgres://…neon.tech/…` URL to use Neon |
| `OPENAI_API_KEY` | empty → offline fallback | enables real OpenAI similarity |
| `OPENAI_MODEL` | `gpt-4o-mini` | chat model used to score idea similarity |

## Deploying with Neon

1. Create a Neon Postgres database and copy its connection string.
2. Set `DATABASE_URL=postgres://…neon.tech/db?sslmode=require` in the backend environment.
3. Run `npm --prefix backend run seed` once, then start the backend.

No code changes are needed — `backend/src/db.js` switches engines based on `DATABASE_URL`.

## Tests

```bash
npm test          # runs the backend test suite (40 tests)
```

Covers every workflow with positive and negative cases — see [`docs/11-test-cases.md`](docs/11-test-cases.md).

## Project layout

```
backend/
  src/
    db.js              # SQLite/Postgres adapter
    schema.js          # dialect-aware schema
    seed.js            # admin account + sample data
    server.js          # express app
    index.js           # entry point (listen)
    constants.js       # roles + scoring criteria
    middleware/auth.js # JWT + role guards
    routes/            # auth, admin, matching, projects, judging, meta
    services/          # llm.js (embeddings), matchingEngine.js
  tests/               # node:test suites (positive + negative)
frontend/
  src/
    pages/             # Login, Register, Dashboard, TeamMatching, Submission, Judging, AdminPanel
    components/        # Nav, MultiSelect
    api.js, auth.jsx   # fetch wrapper + auth context
docs/
  ARCHITECTURE.md
  WORKFLOWS.md
```
# sublet
