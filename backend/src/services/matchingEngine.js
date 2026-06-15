// Team-matching engine.
// Forms groups of up to 4 people by combining:
//   - track overlap (Jaccard)
//   - sponsor overlap (Jaccard)
//   - LLM similarity of "what they plan to build" (gpt-4o-mini, or offline fallback)
//   - role diversity (rewards a mix of buckets, penalises duplicates)
import { planSimilarity } from './llm.js';
import { roleBucket } from '../constants.js';

const W_TRACK = 0.3;
const W_SPONSOR = 0.2;
const W_PLAN = 0.5;
const DIVERSITY_BONUS = 0.25;
const DIVERSITY_PENALTY = 0.2;
const MAX_GROUP = 4;
// Cap concurrent LLM calls. With N opt-ins there are N*(N-1)/2 pairs (e.g. 100 people
// => ~4950 calls); firing them all at once would hit OpenAI rate limits.
const LLM_CONCURRENCY = 8;

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * @param {Array} profiles  unmatched profiles: {id, user_id, role, plan_to_build, tracks:[], sponsors:[]}
 * @returns {Array<Array>}  groups (each an array of the input profiles)
 */
export async function matchProfiles(profiles) {
  if (profiles.length === 0) return [];

  // Precompute the pairwise idea-similarity matrix once (one LLM call per pair),
  // then the greedy grouping below reads from the cache synchronously.
  profiles.forEach((p, i) => { p._idx = i; });
  const sim = {};
  const pairs = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) pairs.push([i, j]);
  }
  await mapLimit(pairs, LLM_CONCURRENCY, async ([i, j]) => {
    sim[`${i}:${j}`] = await planSimilarity(profiles[i].plan_to_build, profiles[j].plan_to_build);
  });
  const planSim = (a, b) => {
    if (a._idx === b._idx) return 1;
    const key = a._idx < b._idx ? `${a._idx}:${b._idx}` : `${b._idx}:${a._idx}`;
    return Math.max(0, sim[key] ?? 0);
  };

  const pairBaseScore = (a, b) =>
    W_TRACK * jaccard(a.tracks, b.tracks) +
    W_SPONSOR * jaccard(a.sponsors, b.sponsors) +
    W_PLAN * planSim(a, b);

  // How well a candidate fits an existing group (avg base score + diversity term).
  const groupFit = (group, cand) => {
    let base = 0;
    for (const m of group) base += pairBaseScore(m, cand);
    base /= group.length;
    const buckets = new Set(group.map((m) => roleBucket(m.role)));
    const cb = roleBucket(cand.role);
    const diversity = buckets.has(cb) ? -DIVERSITY_PENALTY : DIVERSITY_BONUS;
    return base + diversity;
  };

  const remaining = [...profiles];
  const groups = [];

  while (remaining.length > 0) {
    const seed = remaining.shift();
    const group = [seed];
    while (group.length < MAX_GROUP && remaining.length > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const s = groupFit(group, remaining[i]);
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      }
      group.push(remaining.splice(bestIdx, 1)[0]);
    }
    groups.push(group);
  }

  for (const g of groups) for (const p of g) delete p._idx;
  return groups;
}
