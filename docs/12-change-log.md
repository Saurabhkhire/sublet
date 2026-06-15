# 12) Change Log

| Date | Version | Change Type | Description | Updated By |
|------|---------|-------------|-------------|------------|
| 2026-06-15 | v1.0.1 | Feature/Refactor | Admin credentials configurable via `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Team-matching similarity switched from embeddings to the `gpt-4o-mini` chat model (`OPENAI_MODEL`), bounded to 8 concurrent calls. Concurrency hardening: atomic score upsert (`ON CONFLICT`), transactional-style rollback on the one-project-per-person race (no orphan projects), + 2 concurrency tests (42 total). | Update |
| 2026-06-15 | v1.0.0 | Feature | Initial build: auth (register/login/JWT), admin account (`admin123`), admin-managed hackathon config/tracks/sponsors, user management + view/judge access control, optional team matching (track/sponsor overlap + embedding similarity + role diversity, incremental runs), project submission with one-project-per-person, judging with 6-criteria rubric (total /100) and sponsor filtering. React frontend, Express backend, SQLite-local/Neon-prod via one adapter, OpenAI embeddings with offline fallback. 40 positive/negative tests; full §1–§13 docs. | Initial author |
