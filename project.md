# Project Documentation Rules Template

This file is **both**:

1. **Rules** — how project documentation must be written (structure, flexibility, required depth).
2. **Living documentation** — the same Markdown file is filled with **project-specific** content as the codebase evolves.

Anyone (human or assistant) creating or changing code **must** create or refresh documentation **according to these rules**. Treat unfilled placeholders (`<...>`) as work to complete from the actual implementation, not as optional notes.

---

## Meta: Using this file when prompting code generation

Use the blocks below as **system or user prompts** when you ask an assistant to scaffold a repo, implement features, or refactor. Attach this file (or paste its rules section) so outputs stay aligned.

### Mandatory documentation behavior

When generating or updating a **code project**, the assistant **must**:

- Produce or update **`project.md`** (this document’s structure, sections **1–13**) so it reflects **current** behavior and structure—not aspirational placeholders left empty unless truly not applicable.
- Treat **product depth** as living in **`docs/01-*.md` … `docs/13-*.md`**: those files are the **authoritative** UI/DB/API/test narrative for EventHack. **`project.md`** carries **these rules**, repo layout, and **summaries** that must not contradict `docs/`. When behavior changes, update the affected `docs/NN-*.md` first (or in the same change), then align `project.md` and **§12** in [`docs/12-change-log.md`](docs/12-change-log.md).
- For EventHack, maintain **`docs/`**: one **`.md` + `.docx` pair per §1–§13** (see [`docs/README.md`](docs/README.md)). After editing any `docs/NN-*.md`, regenerate the matching **`.docx`** with Pandoc (example: `pandoc docs/04-ui-pages-and-workflows.md -o docs/04-ui-pages-and-workflows.docx`). Close Word if the file is open to avoid “permission denied”.
- If the project uses Word copies for stakeholders, note that **`project.docx`** should be exported from the updated Markdown (same structure); automation is optional.
- Prefer **facts from the repo**: routes, handlers, migrations, env vars, prompts in code, agent configs—documentation must match implementation.
- Write **generically but concretely**: use flexible lists (UI components, triggers, flows) but fill them with **this project’s** real pages, endpoints, tables, and prompts.
- On **updates**, merge changes into existing sections; append a row to **§12 Change Log**; extend **§11 Test Cases** for new or changed workflows.
- **§4 language:** UI/workflows docs use **plain language only** (see §4 template below). Never add API paths, HTTP codes, or JSON to `docs/04-ui-pages-and-workflows.md`; add or update **`docs/07-api-flows.md`** instead.

### Documentation format rules (reuse on every new project or doc pass)

Use the **same shape everywhere** so QA, engineers, and AI tools parse docs consistently:

| Layer | Where | Rule |
|--------|--------|------|
| **§4 UI** | `docs/04-ui-pages-and-workflows.md` (or `project.md` §4 if you keep UI only in root) | **Plain language only** — no HTTP verbs, API paths, status codes, or JSON. For **each UI Page**: **Where to find it**, **Purpose**, **What is on the screen** (table: Name \| Type \| Mandatory/Optional), **Validation**, **When something goes wrong**. For **each Workflow**: **What starts it** → **What the user sees** (numbered) → **What the system does** (numbered, **YES / NO**) → **Simple logic summary** → **Flow picture** (ASCII). Put technical API detail in **`docs/07-api-flows.md`**, not §4. |
| **§5 DB** | `docs/05-database-structure.md` | Tables with Purpose, PK, FKs, constraints, column list. For negotiated artifacts, prefer **header + immutable version rows** (see EventHack bids below). |
| **§7 API** | `docs/07-api-flows.md` | One block per endpoint or endpoint group: Purpose, Auth, payloads, errors, **Related UI** (§4 page name). |
| **§11 Tests** | `docs/11-test-cases.md` | Matrix rows named **`{UI Page} — Workflow {n}: {same short name as §4}`**; detailed cases reference the same titles. |
| **Stakeholder brief** | e.g. `rough idea.txt` | Product docs must **trace** to this scope; gaps get explicit “TBD” or new §4 workflows—do not silently omit. |

New repos cloned from this template should **copy `project.md` + `docs/README.md` + empty `docs/NN` stubs**, then fill §1–§13 in order, keeping the §4/§11 naming contract from day one.

### New project (greenfield)

1. Create the codebase **and** fill **all applicable sections** of this template (skip whole sections only if the project genuinely has no UI, no DB, no LLM, etc.—state “N/A” with one line why).
2. Diagrams (architecture, workflows, agent flow) must match the initial design you implement.
3. **§10.4 File and Method Catalog** must cover main entry files and shared modules (expand over time).

### Existing project (update)

1. Identify what changed (features, schema, APIs, prompts, UI, agents).
2. Update **only the affected subsections** plus **§12 Change Log**; keep the rest accurate—do not wipe unrelated content.
3. Add or revise tests in **§11** for every changed workflow (UI + API as applicable).
4. Bump **Version / Update Tag** in **§1.1** when the release meaningfully changes behavior.

### Copy-paste prompt starters

**A — New project**

```text
Follow the rules and section structure in project.md (attached). While creating this codebase,
generate and maintain project.md: fill every applicable section with concrete project-specific
content derived from the code you write. Use flexible wording where the template allows (UI
components, triggers, flows). Export or plan export of project.docx from the same content.
```

**B — Feature / change**

```text
Follow project.md (attached). Implement the requested change, then update project.md for all
impacted areas (use case if needed, tech stack, architecture/workflows diagrams, DB, POJOs,
API flows, LLM prompts, agent architecture, file/method catalog, tests, change log). For UI
changes, update docs/04 in plain language (no HTTP/API/JSON in §4); put API detail in docs/07.
Preserve unchanged sections; do not remove accurate history unless correcting errors.
```

**C — Documentation-only pass**

```text
Using the repository as source of truth, refresh project.md per its rules. Fix drift between
docs and code. Update §12; extend §11 for any workflow not yet covered.
```

---

## Document outputs

| Output | Role |
|--------|------|
| `project.md` | Canonical editable documentation (this structure). |
| `project.docx` | Optional stakeholder export; must mirror `project.md`. |
| `docs/README.md` | Index of §1–§13 product docs (Markdown + Word) in `docs/`. |
| `docs/NN-*.md` | One Markdown file per §1–§13 (filled product spec). |
| `docs/NN-*.docx` | Word export of the same section (regenerate with Pandoc from the matching `.md`). |

### Repository layout (this monorepo)

- **`frontend/`** — Separate **React** project (own `package.json`, build, env). All browser UI.
- **`backend/`** — Separate **Node.js** API project (own `package.json`, env). All HTTP APIs, auth, jobs, LLM orchestration.
- **Database** — Selected **via configuration** (not hardcoded in app logic):
  - **SQLite** — local / default dev, file-based.
  - **Neon** — serverless Postgres for cloud deployments.
  - **InsForge** — optional; use when the product is backed by InsForge-managed DB/auth/storage per project choice.
- Implement a **single data-access boundary** (repository or ORM layer) so the same API code switches driver/connection string by env.

Product-level documentation for the event/hackathon platform lives in **`docs/`** as §1–§13 pairs (`NN-*.md` + `NN-*.docx`). Start from **[`docs/README.md`](docs/README.md)**.

---

## EventHack reference: Registration roles, venues, sponsor↔event contributions

### After Register: Put as sponsor / venue / organizer

On **Register** (and optionally after verify-email), show **Put as sponsor**, **Put as venue**, **Put as organizer**. Each creates a profile linked to **`users.id`** (`owner_user_id`). **Do not** collect duplicate name/email on sponsor, venue, or event forms—use registration data (+ optional org name override for organizers).

### Venues

- **Any authenticated user** may create a venue (not admin-only).
- Venue includes **building, street, city, state, country, zip** plus description/packages/link.
- Contact display = owning **user** profile.

### Events

- **No** `organizer_name` / `organizer_email` on `events` table; resolve from **`organizers`** + **`users`** at read time.

### Sponsor ↔ event contribution (single table)

**One table:** `event_sponsor_replies`. Full UI: [`docs/04-ui-pages-and-workflows.md`](docs/04-ui-pages-and-workflows.md) — **Event–sponsor contribution thread**.

| Field | Meaning |
|--------|---------|
| `reply_by` | **`sponsor`** = sponsor’s suggested terms; **`event`** = event requesting what sponsor should give |
| `amount_type` | **`total`** (mandatory in each sponsor submit batch), **`food`**, **`prize`**, **`custom`** (multiple rows allowed) |
| Optional | `credits_per_person`, `access_instructions`, `prize_title`, `prize_placement` (1st/2nd/3rd), `prize_type_notes`, `amount` |

**`event_sponsors.status`**: `negotiating` → **`agreed`** when both sides mark agreed (see §4 Workflow 3).

### Team submissions & judging

- **One `submissions` row per team** (`team_id` required).
- **`judge_scores`**: one row per (submission, judge) with `total_score`, `per_sponsor_scores_json`, columns **Creativity, Execution, Impact, Technical Complexity, Presentation**, and comments.

---

## 1) Use Case

> Full section: [`docs/01-use-case.md`](docs/01-use-case.md).

### 1.1 Project Summary
- **Project Name:** SUBLET
- **Version / Update Tag:** v2.8.0
- **Date:** 2026-06-22
- **Owner / Team:** Hackathon organizers
- **Short Description:** A **multi-hackathon** platform. Admins create hackathons, each with its
  own details, tracks, sponsors, selected judges and matching run. Within a hackathon,
  participants opt into team matching, submit one project each, and selected judges score them on
  five categories (Presentation, Execution, Innovation, Impact, Implementation — each /100, total =
  their average) via a ranked leaderboard. Admins can reset a hackathon or delete it.

### 1.2 Problem Statement
- **Problem:** Running a hackathon needs team formation, project submission, controlled
  visibility, and fair judging in one place.
- **Target users:** Participants, admin-selected judges, and the organizer (admin).
- **Importance:** Automates team matching and enforces one-project-per-person and judge-only
  visibility, removing manual coordination.

### 1.3 Goals and Success Criteria
- **Business Goals:** Self-organized balanced teams; one fair, auditable judging process.
- **Technical Goals:** One adapter for SQLite (local) and Neon (cloud); AI similarity with an
  offline fallback; positive + negative tests for every workflow.
- **Success Metrics (KPIs):** 100% of workflows covered by passing tests (40/40); each
  participant on exactly one project (DB-enforced); teams of ≤4 with mixed role buckets.

---

## 2) Tech Stack

> Full section: [`docs/02-tech-stack.md`](docs/02-tech-stack.md).

### 2.1 Frontend
- Framework: React 18
- Language: JavaScript (JSX, ESM)
- UI Library: none (hand-written CSS)
- State Management: React Context (auth) + local state
- Routing: React Router v6; built with Vite 5

### 2.2 Backend
- Runtime: Node.js 24 (ESM)
- Framework: Express 4
- Language: JavaScript
- Authentication: JWT (`jsonwebtoken`) + `bcryptjs`
- Authorization: `authRequired` → `adminRequired` / `judgeRequired` middleware

### 2.3 Database
- Type (SQL/NoSQL): SQL (relational)
- Engine: built-in `node:sqlite` (local) / Postgres-Neon via `pg` (cloud), chosen by `DATABASE_URL`
- ORM / Query Builder: none — thin adapter `backend/src/db.js`
- Migration Tool: none — idempotent `CREATE TABLE IF NOT EXISTS` + seed

### 2.4 LLM / AI
- LLM Provider(s): OpenAI (optional; offline fallback)
- Model(s): none for chat (embeddings only)
- Embedding Model(s): `text-embedding-3-small`
- Vector Store (if any): none (in-memory cosine per run)
- Guardrails / Safety: embeddings only; deterministic fallback on failure

### 2.5 Infrastructure / DevOps
- Hosting: any Node host (backend) + static host (frontend)
- CI/CD: N/A
- Monitoring: N/A
- Logging: console + centralized Express error handler
- Secrets Management: `.env` via `dotenv`

---

## 3) System Architecture

> Full section: [`docs/03-system-architecture.md`](docs/03-system-architecture.md).

### 3.1 High-Level Architecture Description
A React SPA calls a stateless Express JSON API over `/api`. The API authenticates with JWTs and
authorizes by role + `is_judge`. All persistence goes through one adapter (`db.js`) that selects
SQLite or Neon by `DATABASE_URL`. Team matching combines track/sponsor overlap with text
similarity from an embedding service (OpenAI or offline fallback). No cache or queue; matching
runs synchronously on demand.

### 3.2 Architecture Diagram
```text
[Browser / React SPA]
   |  /api (JWT)
   v
[Vite-served frontend] ---> [Express API] ---> [Auth + RBAC]
                                  |
                       +----------+-----------+
                       v                      v
                 [db.js adapter]       [matchingEngine.js]
                       |                      |
            [SQLite (local) |          [llm.js embeddings:
             Postgres/Neon]            OpenAI or offline]
```

### 3.3 Component Responsibilities
- **Frontend:** Pages, route guards by role, token storage, API calls.
- **Backend/API:** Validation, auth/RBAC, business rules (one project/person, incremental
  matching, score ranges), JSON serialization.
- **Database:** Users, config, tracks, sponsors, matching profiles/runs, projects + join tables,
  scores; enforces uniqueness invariants.
- **LLM/Agents:** `llm.js` embeddings only; matching is a deterministic algorithm (no agents).
- **External Integrations:** OpenAI embeddings (optional), Neon Postgres (deployed).

---

## 4) UI Pages and Workflows

> **Filled instance:** [`docs/04-ui-pages-and-workflows.md`](docs/04-ui-pages-and-workflows.md)
> — pages Login, Register, Hackathons, Overview, Team Matching, Submit Project, Judging, Admin
> Panel (WF 1–8: details, tracks, sponsors, judges via search dropdown, project editor, matching,
> reset, delete); each workflow in plain language (no API/JSON). Template guidance retained below.

Document **one UI Page block at a time**. Under that page, list **Workflow 1**, **Workflow 2**, … (each user action or screen load gets its own workflow).

**Audience:** product owners, QA, and stakeholders. **Do not** use HTTP methods, API paths, status codes, JSON bodies, or framework jargon in §4. Describe what people **see** and what the product **does** in everyday language. Technical API contracts belong in **§7** ([`docs/07-api-flows.md`](docs/07-api-flows.md)).

### UI Page: `<Page title>`

- **Where to find it:** Screen path or menu (e.g. `/register`, “Sign up”).
- **Purpose:** One short paragraph.
- **What is on the screen:** Prefer a **Markdown table**: **Name \| Type \| Mandatory** (or Optional). One row per control.

| Name | Type | Mandatory |
|------|------|-------------|
| Username | Text field | Mandatory |

- **Validation:** Bullet list (what must be true before save).
- **When something goes wrong:** Bullet list (messages the user sees).

Then, for **each workflow on that page**, use **exactly** this shape:

### Workflow `<n>`: `<Short name>`

- **What starts it:** e.g. User clicks **Register**, page opens, user picks an option from a list.

**What the user sees**

1. Numbered steps only — screens, buttons, messages, loading, redirects (in order).

**What the system does**

1. Numbered steps only — checks, saves, emails, permissions (in order).
2. Use **YES / NO** branches, e.g. “Username already used? **YES:** show ‘Username taken’ and stop. **NO:** continue.”

**Simple logic summary**

Short `IF` / `THEN` / `STOP` style in plain words (not code).

**Flow picture**

One simple **text** diagram for **this workflow only** (boxes and arrows, no API names).

**Rules**

- Keep **what is on the screen** and **workflows** under the **same UI Page** heading.
- One **flow picture** per workflow.
- When code exists, keep §4 aligned with real behavior; put paths, payloads, and error codes in **§7** and verify them against the repo.
- On every code or behavior change that touches UI: update **`docs/04-ui-pages-and-workflows.md`** first (or in the same PR), then **`project.md`** §4 summary if needed, **§7**, **§11**, and **§12**.

---

## 5) Database Structure

> **Filled instance:** [`docs/05-database-structure.md`](docs/05-database-structure.md) — tables
> `users` (global), `hackathons`, `hackathon_judges`, and hackathon-scoped `tracks`, `sponsors`,
> `matching_profiles`, `matching_runs`, `projects`, `project_participants`
> (unique `(hackathon_id, user_id)` ⇒ one project/person/hackathon), `project_tracks`,
> `project_sponsors`, `scores` (unique per project+judge). Legacy DBs auto-migrate into a
> "Ziward Hackathon" (`backend/src/migrate.js`). Source: `backend/src/schema.js`.

## 5.1 ER/Relationship Notes
Describe relationships across tables (1-1, 1-M, M-M).

## 5.2 Tables

### Table: `<table_name>`
- **Purpose:**
- **Primary Key:**
- **Foreign Keys:**
- **Unique Constraints:**
- **Columns:**
  - `<column_name>` | `<data_type>` | `<nullable yes/no>` | `<key type if any>` | `<description>`
  - `<column_name>` | `<data_type>` | `<nullable yes/no>` | `<key type if any>` | `<description>`

---

## 6) POJO / Domain Models

> **Filled instance:** [`docs/06-domain-models.md`](docs/06-domain-models.md) — row/object shapes
> `User`, `Config`, `Track`, `Sponsor`, `MatchingProfile`, `MatchingRun`, `Project`, `Score`,
> plus config constants `ScoreCriterion` and `RoleOption`. (Plain JS — no ORM classes.)

Document model classes with fields only (no language-specific code block required).

### Class: `<ClassName>`
- **Fields:**
  - `fieldName: DataType`
  - `anotherField: DataType`

---

## 7) API Flows

> **Filled instance:** [`docs/07-api-flows.md`](docs/07-api-flows.md) — all `/api` endpoints
> (auth, global meta/users, hackathons CRUD + reset/delete, and hackathon-scoped tracks,
> sponsors, judges, matching, projects, judging) with payloads, auth, error codes, and the
> related §4 UI action. Source: `backend/src/routes/*`.

### Endpoint: `<METHOD /path>`
- **Purpose:**
- **Auth Required:** Yes/No
- **Request Payload:**
```json
{
  "example": "value"
}
```
- **Response Payload:**
```json
{
  "success": true,
  "data": {}
}
```
- **Validation Rules:**
- **Error Codes:**
- **Related UI Actions:**

### API Sequence Diagram (Text)
```text
Client -> Backend API -> Service Layer -> DB/LLM -> Service Layer -> Backend API -> Client
```

---

## 8) LLM Prompts

> **Filled instance:** [`docs/08-llm-prompts.md`](docs/08-llm-prompts.md) — the only AI use is
> the `plan-to-build-similarity` embedding (OpenAI `text-embedding-3-small`, cosine compared),
> with a deterministic offline fallback. No chat/completion prompts. Source: `services/llm.js`.

### Prompt Spec: `<Prompt Name>`
- **Use Case:**
- **System Prompt:**
- **User Prompt Template:**
- **Input Variables:**
- **Expected Output Format:**
- **Temperature / Max Tokens:**
- **Safety Constraints:**

### Example
- **Input:**
```json
{
  "user_query": "..."
}
```
- **Output:**
```json
{
  "answer": "...",
  "confidence": 0.0
}
```

---

## 9) Agent Architecture

> **Filled instance:** [`docs/09-agent-architecture.md`](docs/09-agent-architecture.md).
> **N/A — no autonomous agents.** The matching engine is a deterministic algorithm
> (track/sponsor Jaccard + embedding cosine + role-bucket diversity, greedy seed-and-grow into
> teams of ≤4, incremental over unmatched profiles). Source: `services/matchingEngine.js`.

### 9.1 Agent Layers
- Planner
- Tool Executor
- Memory/Context Manager
- Guardrails
- Response Composer

### 9.2 Agent Architecture Diagram
```text
[User Request]
     |
     v
[Planner Agent] ---> [Tool Router] ---> [DB/API/LLM Tools]
     |                    |
     v                    v
[Memory/Context]     [Validation/Guardrails]
           \           /
            v         v
         [Final Response]
```

### 9.3 Agent Operational Flow
```text
[Input/Event]
    |
    v
[Planner/Router]
    |
    +--> [Tool/API Path]
    |
    +--> [DB Path]
    |
    +--> [LLM Path]
    |
    v
[Validation + Memory]
    |
    v
[Response/Action]
```

---

## 10) Technical Flow and Code Structure

> **Filled instance:** [`docs/10-technical-flow-and-code-structure.md`](docs/10-technical-flow-and-code-structure.md)
> — request lifecycle, matching/submission/judging flows, the real `backend/` and `frontend/`
> trees, and a file/method catalog for `db.js`, `middleware/auth.js`, `matchingEngine.js`,
> `llm.js`, and `auth.jsx`.

## 10.1 Logical Technical Flow
Document order of operations for each real flow. Do not force a single standard sequence.

### Flow: `<Flow Name>`
1. `<Specific step>`
2. `<Specific step>`
3. `<Specific step>`
4. `<Continue as needed>`

## 10.2 Backend File Structure
Default for this repo: root folder **`backend/`** (Node.js API, separate project).

```text
backend/
  api/
  services/
  functions/
  llm/
  db/
  models/
  middleware/
  tests/
```

## 10.3 Frontend File Structure
Default for this repo: root folder **`frontend/`** (React app, separate project).

```text
frontend/
  pages/
  components/
  hooks/
  services/
  api/
  store/
  utils/
  tests/
```

## 10.4 File and Method Catalog
List key files. For each file, list methods/functions with input, output, and one-line `#` description.

### File: `<path/to/file>`
- **Purpose:**

#### Method: `<methodName>`
- **Input:** `<type/shape>`
- **Output:** `<type/shape>`
- **Description:** `# one line explaining what this method does`

#### Method: `<methodName>`
- **Input:** `<type/shape>`
- **Output:** `<type/shape>`
- **Description:** `# one line explaining what this method does`

---

## 11) Test Cases

> **Filled instance:** [`docs/11-test-cases.md`](docs/11-test-cases.md) — matrix tracing every
> §4 workflow to the 40 automated tests in `backend/tests/` (positive + negative each). Run
> `npm test` → `tests 40 · pass 40 · fail 0`.

Every test should **trace to §4**: name the **UI Page** (same title as in §4) and **Workflow number** (e.g. `Register / Workflow 1`). That keeps QA, automation, and docs aligned.

## 11.1 Test case matrix (by UI Page + Workflow)

### `<UI Page title>` — Workflow `<n>`: `<Short name>`

- **UI positive:** …
- **UI negative:** …
- **API positive:** …
- **API negative:** …

Repeat one subsection per **Workflow** from §4 (same order as in §4 when possible).

## 11.2 Detailed test case format

### Test Case ID: `TC-XXX`

- **Title:**
- **UI Page (§4):** e.g. `Register`
- **Workflow (§4):** e.g. `Workflow 1 — User clicks Register`
- **Type:** UI / API
- **Preconditions:**
- **Steps:**
  1.
  2.
  3.
- **Expected result:**
- **Actual result:**
- **Status:** Pass / Fail

---

## 12) Change Log (For Project Updates)

> **Filled instance:** [`docs/12-change-log.md`](docs/12-change-log.md).

| Date | Version | Change Type | Description | Updated By |
|------|---------|-------------|-------------|------------|
| 2026-06-22 | v2.8.1 | Fix | Submit Project teammate picker replaced with search-as-you-type dropdown (no more all-users list); `GET /api/meta/users?search=` added; `UserSearchInput` extracted to shared component; frontend submission window aligned to 48-hour UTC logic. | Update |
| 2026-06-22 | v2.8.0 | Feature / Fix | Admin project editor (expand any project to edit name, description, links, participants, tracks, sponsors, or delete); searchable user typeahead dropdown (judges + participants, ≤20 results on keystroke); AM/PM time display on Overview; clickable URLs in Community & Support text; submission window broadened to 48-hour UTC range. | Update |
| 2026-06-19 | v2.7.0 | Feature | Hackathons capture event date, start/end time and location (create + admin edit) shown in an Overview "When & Where" card; projects can be submitted **only on the hackathon's event date** (API rejects off-day with 403; Submit page disables off-day). Legacy/no-date hackathons unrestricted; columns auto-migrated; 73 tests. | Update |
| 2026-06-16 | v2.6.0 | Feature | Richer hackathons — Community & Support (Discord), Schedule, track descriptions, per-sponsor description/Tool-Access-&-Credits/Prizes (admin-editable); public Overview info display incl. judges with LinkedIn; 71 tests. | Update |
| 2026-06-16 | v2.5.1 | Fix | Demo seed scripts now write directly to the DB (no backend server needed) via `backend/src/seedData.js`; 67 tests. | Update |
| 2026-06-16 | v2.5.0 | Feature | Account settings page — users edit their own LinkedIn & password (`PUT /api/auth/profile`); admin Delete-all-users confirmed; 66 tests. | Update |
| 2026-06-16 | v2.4.2 | Fix/Feature | Judging alignment fixes; Results & Investments tabs show Tracks/Sponsors columns and a click-to-open details popup (demo + GitHub links, tracks, sponsors, team, category averages). | Update |
| 2026-06-16 | v2.4.1 | Feature | Investment input gains unit options (Exact $, Thousand, Lakh, Million, Crore, Billion) with live preview; compact amounts on the leaderboard. | Update |
| 2026-06-15 | v2.4.0 | Feature | Judging investment feature — judges record a would-be investment per project; new Investments tab ranks projects by total invested across judges; 61 tests. | Update |
| 2026-06-15 | v2.3.0 | Feature | Judging split into two tabs (Score / Results-&-averages leaderboard with per-category averages + `my_score`); app-wide light/dark theme toggle; UI polish. | Update |
| 2026-06-15 | v2.2.1 | Change | LinkedIn URL required at registration; 59 tests. | Update |
| 2026-06-15 | v2.2.0 | Feature | Judging redesign — leaderboard by average score, big Demo/Git links, tracks & sponsors shown; scoring changed to 5 categories (Presentation/Execution/Innovation/Impact/Implementation, each /100, total = average); 58 tests. | Update |
| 2026-06-15 | v2.1.0 | Feature | Demo-data seed scripts; admin **Delete all users**; matching opt-ins are now **visible to each other** to find teammates; 57 tests. | Update |
| 2026-06-15 | v2.0.0 | Feature | SUBLET branding + multi-hackathon model (per-hackathon details/tracks/sponsors/judges/matching/projects), per-hackathon judge access, admin reset + delete-hackathon, legacy auto-migration into "Ziward Hackathon", full professional UI redesign, 51 tests. | Update |
| 2026-06-15 | v1.0.0 | Feature | Initial build — auth/admin/config, team matching, submission (one project/person), judging rubric (/100), SQLite↔Neon adapter, OpenAI w/ offline fallback, 40 tests, full §1–§13 docs. | Initial author |

---

## 13) Document Generation Checklist

Use after every **new project** or **meaningful update** (code or docs).
**Filled instance:** [`docs/13-document-generation-checklist.md`](docs/13-document-generation-checklist.md) (v1.0.0 — all applicable items checked; EventHack-only items marked N/A with reasons).

- [x] **Meta rules** (top of this file): `project.md` filled from implementation; N/A sections justified
- [ ] `project.md` is updated and matches the repo
- [ ] `project.docx` exported from latest markdown (if your process uses Word)
- [ ] **`docs/`** product sections (`01-*.md` … `13-*.md`, and matching `.docx` if you use Word) updated; index: [`docs/README.md`](docs/README.md)
- [ ] Architecture diagram updated
- [ ] **§4** (`docs/04-…`): plain language only; each **UI Page** has **What is on the screen** (table) + every **Workflow** with What starts it → What the user sees → What the system does (YES/NO) → Simple logic summary → Flow picture (no API/JSON in §4)
- [ ] **Registration roles:** Put as sponsor / venue / organizer flows documented in §4 Register
- [ ] **Contributions:** `event_sponsor_replies` single-table model matches project.md reference
- [ ] **Judging:** `judge_scores` team-based rubric + per-sponsor columns in §5
- [ ] DB schema verified against migrations / live schema
- [ ] API flows verified against routes and handlers
- [ ] LLM prompts verified against code or config
- [ ] Agent architecture verified if agents are used
- [ ] Test cases (§11) cover all workflows; new cases added for changes
- [ ] Change log (§12) has an entry for this change

