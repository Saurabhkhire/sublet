# 2) Tech Stack

## 2.1 Frontend
- **Framework:** React 18 (app branded **SUBLET**)
- **Language:** JavaScript (JSX, ES modules)
- **UI Library:** none — hand-written design system in `frontend/src/styles.css` (Inter font,
  light theme, top nav + hackathon-workspace sidebar)
- **State Management:** React Context for auth (`frontend/src/auth.jsx`); hackathon-scoped meta
  shared via the router Outlet context (`HackathonLayout`); local component state otherwise
- **Routing:** React Router v6 — `/`, `/users`, and nested `/h/:hid/{matching,submit,judging,admin}`
- **Build / Dev server:** Vite 5 (dev server proxies `/api` → `http://localhost:4000`)

## 2.2 Backend
- **Runtime:** Node.js 24 (ES modules, top-level await)
- **Framework:** Express 4
- **Language:** JavaScript
- **Authentication:** JWT (`jsonwebtoken`), 7-day tokens; passwords hashed with `bcryptjs`
- **Authorization:** role + flag middleware — `authRequired`, `adminRequired`, `judgeRequired`
  (`backend/src/middleware/auth.js`)

## 2.3 Database
- **Type (SQL/NoSQL):** SQL (relational)
- **Engine:** SQLite locally via built-in `node:sqlite` (no native build); **Neon/Postgres**
  in the cloud via `pg`
- **ORM / Query Builder:** none — a thin hand-written adapter (`backend/src/db.js`) exposing
  `run / get / all / insert / exec`, with `?`→`$n` placeholder rewriting for Postgres
- **Migration Tool:** none — idempotent `CREATE TABLE IF NOT EXISTS` schema in
  `backend/src/schema.js`, plus a seed in `backend/src/seed.js`

## 2.4 LLM / AI
- **LLM Provider(s):** OpenAI (optional; offline fallback when no key)
- **Model(s):** `gpt-4o-mini` chat model (configurable via `OPENAI_MODEL`) — rates idea
  similarity for team matching and returns a JSON score
- **Embedding Model(s):** none
- **Vector Store (if any):** none — pairwise similarity is computed per matching run and cached
  in memory
- **Guardrails / Safety:** JSON-only response (`response_format: json_object`), temperature 0,
  score clamped to [0,1]; on any failure or missing key it falls back to a deterministic local
  token-overlap score so matching never blocks

## 2.5 Infrastructure / DevOps
- **Hosting:** any Node host for the backend; any static host for the built frontend
- **CI/CD:** N/A (not configured in this repo)
- **Monitoring:** N/A
- **Logging:** console logging + centralized Express error handler
- **Secrets Management:** environment variables via `dotenv` (`backend/.env`)
