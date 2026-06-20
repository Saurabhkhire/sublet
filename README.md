# SUBLET

A **multi-hackathon** platform — team matching, project submission and judging, one hackathon at a time.

- **Frontend:** React + Vite (SUBLET branding, professional light UI)
- **Backend:** Node.js + Express
- **Database:** SQLite locally (built into Node — no native build), Neon/Postgres when deployed
- **LLM:** OpenAI `gpt-4o-mini` for team-matching idea similarity (with an offline fallback)

## Features

- **Register / Login** with email, password, LinkedIn (JWT auth).
- **Multi-hackathon:** the admin creates hackathons; everything (details, tracks, sponsors,
  judges, matching, projects, scores) is **scoped per hackathon**.
- **Admin** (default `admin123` / `admin123`, configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD`):
  create hackathons, edit name & details, manage Tracks and Sponsors (multiple entries),
  add/remove global users, pick who can **view & judge** each hackathon, run matching, and
  **reset** a hackathon (delete all projects + judging data) or delete it entirely.
- **Team matching (optional):** people pick role, tracks, sponsors and describe what they plan to
  build. Admin triggers matching into teams of ≤ 4, scored on track/sponsor overlap, AI similarity
  of the idea, and **role diversity**. Re-running only matches new people.
- **Project submission:** name, description, demo video, git link, team members, sponsors, tracks.
  Each person can be on **only one** project **per hackathon**.
- **Judging (three tabs):** **Score projects** — review each project (big Demo & Git links, tracks,
  sponsors), score it on **5 categories** (Presentation, Execution, Innovation, Impact,
  Implementation, each 0–100, total = their average), and record how much you'd **invest** in it;
  **Results & averages** — a ranked leaderboard of each project's **average score across all judges**
  (medals + per-category averages); and **Investments** — projects ranked by **total invested across
  all judges**. Filter by sponsor; admin sees every judge's breakdown.
- **Light & dark mode:** an app-wide theme toggle (☾ / ☀) in the top bar, remembered across visits.
- **Docs:** full §1–§13 product docs in [`docs/`](docs/README.md) per the rules in
  [`project.md`](project.md).
- **Tests:** positive **and** negative test case for every workflow (51 tests).

> **Upgrading an existing local DB?** On first boot the backend auto-migrates a pre-multi-hackathon
> SQLite database, moving all existing data into a hackathon named **"Ziward Hackathon"**.

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

## Demo data (seed scripts)

Populate a hackathon with demo users and projects. The scripts write **directly to the database**,
so the backend does **not** need to be running. Run `npm run install:all` once first.

```bash
# Add 50 users (emails like seeduser001@sublet.test, password: password123)
npm run seed:users            # or: npm run seed:users 50

# Add 50 projects (one per seeded user) to the target hackathon — run AFTER seed:users
npm run seed:projects         # or: npm run seed:projects 50
```

To remove the data, use the **admin UI**: **Users → Delete all users** (also clears any
projects left with no participants), and/or a hackathon's **Admin → Danger zone → Delete all
projects & judge data**.

Configure via env vars (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `COUNT` | `50` | how many to create (or pass as the first CLI arg) |
| `HACKATHON` | `Ziward Hackathon` | target hackathon by **name or id** (falls back to the first) |
| `SEED_PASSWORD` | `password123` | password for the seeded users |
| `SEED_DOMAIN` | `sublet.test` | email domain used to name/identify seeded users |

```bash
# Seed 30 users + 30 projects into a specific hackathon
HACKATHON="Ziward Hackathon" npm run seed:users 30
HACKATHON="Ziward Hackathon" npm run seed:projects 30
```

> The scripts open the same database the API uses (SQLite locally, or Neon if `DATABASE_URL` is set
> in `backend/.env`), creating the schema + admin + sample hackathon first if needed. Each seeded
> project is created by a distinct seeded user (one project per person per hackathon). Seeded users
> use the `@sublet.test` domain; seeded projects are named `[seed] Project NNN`. Re-running is safe
> (idempotent). If the backend is also running, the scripts share the database file safely.

## Deploying with Neon

1. Create a Neon Postgres database and copy its connection string.
2. Set `DATABASE_URL=postgres://…neon.tech/db?sslmode=require` in the backend environment.
3. Run `npm --prefix backend run seed` once, then start the backend.

No code changes are needed — `backend/src/db.js` switches engines based on `DATABASE_URL`.

## Tests

```bash
npm test          # runs the backend test suite (51 tests)
```

Covers every workflow with positive and negative cases — see [`docs/11-test-cases.md`](docs/11-test-cases.md).

## Project layout

```
backend/
  src/
    db.js              # SQLite/Postgres adapter
    schema.js          # dialect-aware multi-hackathon schema
    migrate.js         # legacy DB upgrade -> "Ziward Hackathon"
    seed.js            # admin account + sample hackathon
    server.js          # express app (mounts nested hackathon routers)
    index.js           # entry point (listen)
    constants.js       # roles + scoring criteria
    middleware/auth.js # JWT + role + per-hackathon judge guards
    routes/            # auth, admin(users), meta, hackathons, matching, projects
    services/          # llm.js (gpt-4o-mini), matchingEngine.js
  tests/               # node:test suites (positive + negative)
frontend/
  src/
    pages/             # Login, Register, Hackathons, Users, HackathonLayout,
                       #   Overview, TeamMatching, Submission, Judging, AdminPanel
    components/        # TopNav, MultiSelect
    api.js, auth.jsx   # fetch wrapper + auth context
docs/                  # §1–§13 product docs (.md + .docx)
```
# sublet
