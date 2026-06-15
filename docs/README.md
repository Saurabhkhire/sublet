# Documentation Index

Product documentation for the **Hackathon Platform**, organised as §1–§13 per the rules in
[`../project.md`](../project.md). Each section is a Markdown file with a matching Word export
(`.docx`) regenerated with Pandoc.

| § | File | Contents |
|---|------|----------|
| 1 | [01-use-case.md](01-use-case.md) | Problem, users, goals, success metrics |
| 2 | [02-tech-stack.md](02-tech-stack.md) | Frontend, backend, DB, AI, infra |
| 3 | [03-system-architecture.md](03-system-architecture.md) | Components, diagram, responsibilities |
| 4 | [04-ui-pages-and-workflows.md](04-ui-pages-and-workflows.md) | UI pages + workflows (plain language) |
| 5 | [05-database-structure.md](05-database-structure.md) | Tables, keys, constraints, columns |
| 6 | [06-domain-models.md](06-domain-models.md) | Domain models / shapes |
| 7 | [07-api-flows.md](07-api-flows.md) | Endpoints, payloads, errors |
| 8 | [08-llm-prompts.md](08-llm-prompts.md) | Embedding/LLM usage spec |
| 9 | [09-agent-architecture.md](09-agent-architecture.md) | Agent layers (N/A — deterministic engine) |
| 10 | [10-technical-flow-and-code-structure.md](10-technical-flow-and-code-structure.md) | Flows + file/method catalog |
| 11 | [11-test-cases.md](11-test-cases.md) | Test matrix traced to §4 workflows |
| 12 | [12-change-log.md](12-change-log.md) | Change history |
| 13 | [13-document-generation-checklist.md](13-document-generation-checklist.md) | Completion checklist |

## Regenerating the Word (.docx) exports

```bash
# From the repo root, regenerate one section after editing its .md:
pandoc docs/04-ui-pages-and-workflows.md -o docs/04-ui-pages-and-workflows.docx

# Or regenerate all of them:
for f in docs/*.md; do [ "$f" = "docs/README.md" ] && continue; pandoc "$f" -o "${f%.md}.docx"; done
```

> Note (per §4 rules): `04-ui-pages-and-workflows.md` uses **plain language only** — no HTTP
> verbs, API paths, status codes, or JSON. Technical API detail lives in `07-api-flows.md`.

## Scope note vs the `project.md` template

`project.md` is a reusable template whose "EventHack" reference section describes a different
product (sponsors/venues/organizers, sponsor↔event contribution threads, team-based
`submissions`/`judge_scores`). **This** project is a hackathon submission + team-matching +
judging app. Template items that don't exist here (venues, organizers, `event_sponsor_replies`,
agents) are marked **N/A** in the relevant section with a one-line reason.
