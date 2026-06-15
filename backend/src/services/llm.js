// LLM similarity for the "what do you plan to build" team-matching score.
// Uses an OpenAI chat model (default gpt-4o-mini) to rate how similar two ideas are.
// Falls back to a deterministic local token-overlap score when no API key is set
// (so the app and tests work fully offline).

function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

// Deterministic offline similarity: Jaccard overlap of significant tokens.
function jaccardSimilarity(a, b) {
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function openaiSimilarity(a, b) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You rate how similar two hackathon project ideas are, so people building ' +
            'related things can be grouped. Respond ONLY with JSON of the form ' +
            '{"score": <number between 0 and 1>}, where 1 means essentially the same idea ' +
            'and 0 means completely unrelated.',
        },
        {
          role: 'user',
          content: `Idea A: ${a || '(none)'}\n\nIdea B: ${b || '(none)'}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI chat failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);
  const score = Number(parsed.score);
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

/** Returns a similarity score in [0,1] between two "plan to build" descriptions. */
export async function planSimilarity(a, b) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await openaiSimilarity(a, b);
    } catch (err) {
      // Fail soft to the offline score so matching never blocks.
      console.warn('[llm] OpenAI similarity failed, using fallback:', err.message);
    }
  }
  return jaccardSimilarity(a, b);
}
