// Embedding service for the "what do you plan to build" similarity score.
// Uses OpenAI embeddings when OPENAI_API_KEY is set; otherwise falls back to a
// deterministic local hashing embedding so the app (and tests) work fully offline.

const DIM = 256;

function deterministicEmbed(text) {
  // Bag-of-words hashed into a fixed-size vector. Deterministic + cosine-friendly.
  const vec = new Array(DIM).fill(0);
  const tokens = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (const tok of tokens) {
    let h = 0;
    for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) >>> 0;
    vec[h % DIM] += 1;
  }
  return vec;
}

async function openaiEmbed(texts) {
  const model = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.data.map((d) => d.embedding);
}

/** Returns an array of embedding vectors, one per input text. */
export async function embedTexts(texts) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await openaiEmbed(texts);
    } catch (err) {
      // Fail soft to the offline embedding so matching never blocks.
      console.warn('[llm] OpenAI embedding failed, using fallback:', err.message);
    }
  }
  return texts.map(deterministicEmbed);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
