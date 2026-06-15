# 2) Tech Stack

## 2.1 Frontend
- **Framework:** React 18
- **Language:** JavaScript (JSX, ES modules)
- **UI Library:** none (hand-written CSS in `frontend/src/styles.css`)
- **State Management:** React Context (`frontend/src/auth.jsx`) + local component state
- **Routing:** React Router v6 (`react-router-dom`)
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
- **Model(s):** none for chat — similarity uses embeddings only
- **Embedding Model(s):** `text-embedding-3-small` (configurable via `OPENAI_EMBED_MODEL`)
- **Vector Store (if any):** none — embeddings are computed per matching run and compared in
  memory with cosine similarity
- **Guardrails / Safety:** embeddings only (no free-text generation), so no prompt-injection
  surface; failures fall back to a deterministic local embedding

## 2.5 Infrastructure / DevOps
- **Hosting:** any Node host for the backend; any static host for the built frontend
- **CI/CD:** N/A (not configured in this repo)
- **Monitoring:** N/A
- **Logging:** console logging + centralized Express error handler
- **Secrets Management:** environment variables via `dotenv` (`backend/.env`)
