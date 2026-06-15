# 3) System Architecture

## 3.1 High-Level Architecture Description
A React single-page app talks to a stateless Express JSON API over `/api`. The API
authenticates requests with JWTs and authorizes by role (`user` / `admin`) and the `is_judge`
flag. All persistence goes through one data-access boundary (`db.js`) that selects SQLite or
Postgres/Neon by configuration. Team matching is a backend service that combines structured
overlap (tracks/sponsors) with text similarity from an embedding service (OpenAI or an offline
fallback). There is no caching layer or queue; matching runs synchronously on demand.

## 3.2 Architecture Diagram
```text
[Browser / React SPA]
   |  HTTPS (JWT in Authorization header)
   v
[Frontend App (Vite)] ---/api---> [Express API]
                                     |
                  +------------------+-------------------+
                  v                  v                   v
          [Auth + RBAC]      [db.js adapter]      [Matching service]
        (jwt, bcrypt,      (run/get/all/insert)   (matchingEngine.js)
         middleware)              |                      |
                                  v                      v
                        [SQLite (local)        [llm.js embeddings]
                         | Postgres/Neon]    (OpenAI or offline fallback)
```

## 3.3 Component Responsibilities
- **Frontend:** Renders pages (Login, Register, Dashboard, Team Matching, Submit Project,
  Judging, Admin Panel); stores the JWT; guards routes by role; calls the API.
- **Backend/API:** Validates input, enforces auth/RBAC, runs business rules (one project per
  person, incremental matching, score ranges), serializes JSON.
- **Database:** Stores users, config, tracks, sponsors, matching profiles/runs, projects and
  their join tables, and scores. Enforces uniqueness invariants.
- **LLM/Agents:** `llm.js` produces embeddings for "what they plan to build". No autonomous
  agents — matching is a deterministic algorithm (see §9).
- **External Integrations:** OpenAI embeddings API (optional). Neon Postgres (when deployed).

## 3.4 Database selection (configuration-driven)
`db.js` reads `DATABASE_URL`. If it starts with `postgres`, a `pg` pool connects to Neon;
otherwise the built-in `node:sqlite` engine opens `backend/data/app.db`. The same application
code and schema shape run on both; only `schema.js` branches on PK syntax (`SERIAL` vs
`AUTOINCREMENT`). This is the single data-access boundary required by the template.
