import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser } from './helpers.js';

let H, adminToken;
const tokens = {};
const ids = {};
before(async () => {
  H = await bootTestServer('concurrency');
  adminToken = await loginAdmin(H.api);
  for (const n of ['a', 'b', 'c', 'd', 'e']) {
    tokens[n] = await registerUser(H.api, `${n}@example.com`);
  }
  const users = await H.api('GET', '/api/meta/users', { token: tokens.a });
  for (const u of users.body) ids[u.email[0]] = u.id;
});
after(async () => { await H.cleanup(); });

test('concurrency: two submissions racing for the same participant — exactly one wins, no orphan', async () => {
  // Both A and C try to submit a project that includes participant E at the same time.
  const [r1, r2] = await Promise.all([
    H.api('POST', '/api/projects', { token: tokens.a, body: { name: 'P-A', participants: [ids.e] } }),
    H.api('POST', '/api/projects', { token: tokens.c, body: { name: 'P-C', participants: [ids.e] } }),
  ]);
  const statuses = [r1.status, r2.status].sort();
  // One succeeds (201), one is rejected (409 conflict).
  assert.deepEqual(statuses, [201, 409]);

  // E must belong to exactly one project; the rejected attempt left no orphan project.
  const all = await H.api('GET', '/api/projects', { token: adminToken });
  const withE = all.body.filter((p) => p.participants.some((x) => x.id === ids.e));
  assert.equal(withE.length, 1);
  // The loser's project name must not exist as an empty/orphan row.
  const names = all.body.map((p) => p.name);
  const winner = withE[0].name;
  const loser = winner === 'P-A' ? 'P-C' : 'P-A';
  assert.ok(!names.includes(loser), 'rejected submission should not have created a project');
});

test('concurrency: same judge scoring the same project twice at once — one score row', async () => {
  // Make B a judge and give B a project to score.
  const proj = await H.api('POST', '/api/projects', { token: tokens.d, body: { name: 'ToScore' } });
  const users = await H.api('GET', '/api/admin/users', { token: adminToken });
  const judge = users.body.find((u) => u.email === 'b@example.com');
  await H.api('PATCH', `/api/admin/users/${judge.id}`, { token: adminToken, body: { is_judge: true } });

  const score = { presentation: 10, technical: 10, code_quality: 10, functionality: 10, innovation: 10, ux: 10 };
  const [s1, s2] = await Promise.all([
    H.api('POST', `/api/judging/${proj.body.id}/score`, { token: tokens.b, body: { ...score, presentation: 15 } }),
    H.api('POST', `/api/judging/${proj.body.id}/score`, { token: tokens.b, body: { ...score, presentation: 5 } }),
  ]);
  assert.equal(s1.status, 200);
  assert.equal(s2.status, 200);

  const scores = await H.api('GET', `/api/judging/${proj.body.id}/scores`, { token: adminToken });
  assert.equal(scores.body.judge_count, 1); // upsert: still exactly one row for this judge
});
