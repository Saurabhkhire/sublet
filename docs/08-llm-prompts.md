# 8) LLM Prompts

This project uses the LLM **only for embeddings** to measure how similar two participants'
"what do you plan to build" descriptions are. There are **no chat/completion prompts**, so the
classic system/user prompt template is N/A. The spec below documents the embedding usage as the
single AI integration.

### Prompt Spec: `plan-to-build-similarity` (embeddings)
- **Use Case:** Score idea similarity between participants during team matching so people
  building related things are more likely to be grouped.
- **System Prompt:** N/A (embeddings endpoint, no instructions).
- **User Prompt Template:** the raw `plan_to_build` text of each participant is sent as input.
- **Input Variables:** `plan_to_build` (one per participant in the current matching run).
- **Provider / Model:** OpenAI `text-embedding-3-small` (override via `OPENAI_EMBED_MODEL`).
- **Expected Output Format:** a numeric vector per input; similarity = cosine of two vectors,
  clamped to `[0, 1]`, weighted at 0.5 in the pair score (see §9 / matching engine).
- **Temperature / Max Tokens:** N/A for embeddings.
- **Safety Constraints:** No free-text generation, so no prompt-injection or unsafe-output
  surface. If the API key is absent or the call fails, the system falls back to a deterministic
  local bag-of-words hashed embedding (`backend/src/services/llm.js`), so matching never blocks
  and tests run fully offline.

### Example
- **Input:**
```json
{ "input": ["A tool to summarise PDFs with AI", "Chat over your PDFs with AI"] }
```
- **Output (conceptual):**
```json
{ "similarity_between_the_two": 0.82 }
```

> The actual OpenAI response is a list of embedding vectors; the app computes the cosine
> similarity itself. With no API key, the offline embedding yields a deterministic similarity
> from shared tokens.
