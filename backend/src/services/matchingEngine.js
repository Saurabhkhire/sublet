// Team-matching engine.
// Forms groups of up to 4 people by combining:
//   - track overlap (Jaccard)
//   - sponsor overlap (Jaccard)
//   - LLM similarity of "what they plan to build" (cosine of embeddings)
//   - role diversity (rewards a mix of buckets, penalises duplicates)
import { embedTexts, cosineSimilarity } from './llm.js';
import { roleBucket } from '../constants.js';

const W_TRACK = 0.3;
const W_SPONSOR = 0.2;
const W_PLAN = 0.5;
const DIVERSITY_BONUS = 0.25;
const DIVERSITY_PENALTY = 0.2;
const MAX_GROUP = 4;

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function pairBaseScore(a, b) {
  return (
    W_TRACK * jaccard(a.tracks, b.tracks) +
    W_SPONSOR * jaccard(a.sponsors, b.sponsors) +
    W_PLAN * a._sim(b)
  );
}

// How well a candidate fits an existing group (avg base score + diversity term).
function groupFit(group, cand) {
  let base = 0;
  for (const m of group) base += pairBaseScore(m, cand);
  base /= group.length;
  const buckets = new Set(group.map((m) => roleBucket(m.role)));
  const cb = roleBucket(cand.role);
  const diversity = buckets.has(cb) ? -DIVERSITY_PENALTY : DIVERSITY_BONUS;
  return base + diversity;
}

/**
 * @param {Array} profiles  unmatched profiles: {id, user_id, role, plan_to_build, tracks:[], sponsors:[]}
 * @returns {Array<Array>}  groups (each an array of the input profiles)
 */
export async function matchProfiles(profiles) {
  if (profiles.length === 0) return [];

  // Precompute embeddings once, attach a memoised similarity helper.
  const embeddings = await embedTexts(profiles.map((p) => p.plan_to_build));
  const simCache = new Map();
  profiles.forEach((p, i) => {
    p._emb = embeddings[i];
    p._idx = i;
    p._sim = (other) => {
      const key = p._idx < other._idx ? `${p._idx}:${other._idx}` : `${other._idx}:${p._idx}`;
      if (simCache.has(key)) return simCache.get(key);
      const v = Math.max(0, cosineSimilarity(p._emb, other._emb));
      simCache.set(key, v);
      return v;
    };
  });

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

  // Clean the temp fields off the returned objects.
  for (const g of groups) for (const p of g) {
    delete p._emb;
    delete p._sim;
    delete p._idx;
  }
  return groups;
}
