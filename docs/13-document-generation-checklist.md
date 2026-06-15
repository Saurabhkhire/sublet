# 13) Document Generation Checklist

State after the initial v1.0.0 build.

- [x] **Meta rules:** `project.md` §1–§13 filled from the implementation; N/A sections justified
  (agents §9, some EventHack-only items).
- [x] `project.md` is updated and matches the repo.
- [x] `project.docx` exported from the latest Markdown (Pandoc).
- [x] **`docs/`** product sections `01-*.md … 13-*.md` written, with matching `.docx` exports;
  index in [`README.md`](README.md).
- [x] Architecture diagram updated (§3 / [03-system-architecture.md](03-system-architecture.md)).
- [x] **§4** ([04-…](04-ui-pages-and-workflows.md)): plain language only; each UI Page has a
  "What is on the screen" table and every Workflow has What starts it → What the user sees →
  What the system does (YES/NO) → Simple logic summary → Flow picture (no API/JSON in §4).
- [ ] **Registration roles** (Put as sponsor / venue / organizer): **N/A** — this product has
  no sponsor/venue/organizer self-registration; registration creates a normal participant.
- [ ] **Contributions** (`event_sponsor_replies` single-table model): **N/A** — no
  sponsor↔event negotiation in this product.
- [ ] **Judging** (`judge_scores` team rubric + per-sponsor columns): **N/A in that exact shape**
  — this product scores **per participant-judge per project** via the `scores` table with six
  criteria summing to 100 (documented in §5).
- [x] DB schema verified against `backend/src/schema.js`.
- [x] API flows verified against `backend/src/routes/*` and middleware.
- [x] LLM usage (embeddings) verified against `backend/src/services/llm.js` (§8).
- [x] Agent architecture: **N/A** — deterministic matching engine documented in §9 instead.
- [x] Test cases (§11) cover every workflow with positive and negative cases (40 passing).
- [x] Change log (§12) has the v1.0.0 entry.

> N/A items above are EventHack-template features that do not exist in this product; they are
> intentionally unchecked with a one-line reason, as the rules allow.
