# 8) LLM Prompts

The LLM is used for one thing: rating how similar two participants' "what do you plan to build"
descriptions are, which feeds the team-matching score. It uses an OpenAI **chat** model
(`gpt-4o-mini` by default, set by `OPENAI_MODEL`) that returns a JSON similarity score.

### Prompt Spec: `plan-to-build-similarity`
- **Use Case:** Score idea similarity between two participants during team matching so people
  building related things are more likely to be grouped together.
- **Provider / Model:** OpenAI `gpt-4o-mini` (override via `OPENAI_MODEL`).
- **System Prompt:**
  > You rate how similar two hackathon project ideas are, so people building related things can
  > be grouped. Respond ONLY with JSON of the form `{"score": <number between 0 and 1>}`, where
  > 1 means essentially the same idea and 0 means completely unrelated.
- **User Prompt Template:** `Idea A: {plan_a}\n\nIdea B: {plan_b}`
- **Input Variables:** `plan_a`, `plan_b` (the two `plan_to_build` texts).
- **Expected Output Format:** `{ "score": number }` in `[0,1]`; the app clamps and weights it
  at 0.5 in the pair score (see §9).
- **Temperature / Max Tokens:** temperature `0`; `response_format: { type: "json_object" }`.
- **Safety Constraints:** JSON-only structured output (no free-form text shown to users), so no
  prompt-injection or unsafe-output surface. If `OPENAI_API_KEY` is absent or the call fails,
  the system falls back to a deterministic local token-overlap (Jaccard) score
  (`backend/src/services/llm.js`), so matching works fully offline and tests are deterministic.
- **Scale note:** matching makes one call per pair of opt-ins (N·(N−1)/2). Calls are bounded to
  8 concurrent (`LLM_CONCURRENCY` in `matchingEngine.js`) to respect rate limits — see §9 and
  the load discussion in §3.

### Example
- **Input:**
```json
{ "Idea A": "A tool to summarise PDFs with AI", "Idea B": "Chat over your PDFs with AI" }
```
- **Output:**
```json
{ "score": 0.82 }
```
