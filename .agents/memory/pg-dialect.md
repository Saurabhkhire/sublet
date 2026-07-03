---
name: Postgres SQL dialect
description: Differences between SQLite and Postgres SQL that caused real bugs in this codebase.
---

**Rule:** Never use `GROUP_CONCAT` in queries that run on Postgres (Neon). The codebase targets Postgres in production (`isPg = true`).

**Why:** `GROUP_CONCAT` is SQLite-specific. Postgres uses `STRING_AGG`. Rather than branching on `isPg`, the safest pattern is to fetch aggregate data in a separate JS loop (like `loadProjectDetail` already does for participants/tracks/sponsors).

**How to apply:** Any time you need per-row aggregates (emails, names, counts) in a query that runs on both SQLite and Postgres, do a separate `all()` call per row in JS instead of using SQL aggregate functions. Only use SQL aggregates (COUNT, SUM, AVG) which work the same on both engines.

**Example of the safe pattern:**
```js
const projects = await all('SELECT id, name FROM projects WHERE hackathon_id = ?', [hid]);
for (const p of projects) {
  const members = await all('SELECT u.email FROM project_participants pp JOIN users u ON u.id = pp.user_id WHERE pp.project_id = ?', [p.id]);
  p.team_emails = members.map(m => m.email).join(',');
}
```
