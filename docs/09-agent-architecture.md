# 9) Agent Architecture

**N/A — this project has no autonomous LLM agents.** There is no planner, tool router, or
agent memory. The only AI use is a chat call (`gpt-4o-mini`) that rates idea similarity (see
§8). Team matching is a **deterministic algorithm**, documented here in place of an agent flow
because it is the core "intelligent" component.

## 9.1 Matching algorithm (deterministic)
Implemented in `backend/src/services/matchingEngine.js`. For the set of **unmatched** profiles:

1. Compute a pairwise idea-similarity matrix by asking `gpt-4o-mini` to score each pair of
   `plan_to_build` texts in [0,1] (offline token-overlap fallback when no key). Calls are
   bounded to 8 concurrent.
2. Define a pair score between two people:
   ```text
   pairScore(a, b) = 0.3 · Jaccard(tracks_a, tracks_b)
                   + 0.2 · Jaccard(sponsors_a, sponsors_b)
                   + 0.5 · planSimilarity(a, b)   // from gpt-4o-mini (or fallback)
   ```
3. Map each role to a bucket: `engineering | design | product | domain`.
4. Greedily build teams of up to 4 (seed-and-grow): for the current team, pick the remaining
   person with the highest `groupFit`:
   ```text
   groupFit(team, cand) = avg(pairScore(member, cand) for member in team)
                        + (cand bucket new to team ? +0.25 : -0.20)
   ```
   The diversity term rewards mixing role buckets and penalizes stacking the same one.
5. Mark grouped people `matched=1`, assign a `group_id`, and record a `matching_runs` row.

## 9.2 Operational Flow
```text
[Admin clicks Run matching]
        |
        v
[Load profiles where matched = 0] --(none)--> [Reject: nothing new]
        |
        v
[Score idea-pair similarity via gpt-4o-mini | offline fallback, bounded 8 concurrent]
        |
        v
[Greedy seed-and-grow into teams of <=4]
   (track/sponsor overlap + idea similarity + role-bucket diversity)
        |
        v
[Persist: matched=1, group_id, matching_runs row] -> [Return teams]
```

Because only `matched=0` profiles are considered, re-running matches **only newcomers** and
never reshuffles existing teams.
