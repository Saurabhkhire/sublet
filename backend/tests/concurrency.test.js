import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser, createHackathon, makeJudge, userIdByEmail } from './helpers.js';

let H, adminToken, hid;
const tokens = {};
const ids = {};
before(async () => {
  H = await bootTestServer('concurrency');
  adminToken = await loginAdmin(H.api);
  hid = await createHackathon(H.api, adminToken, 'Race Hack');
  for (const n of ['a', 'b', 'c', 'd', 'e']) tokens[n] = await registerUser(H.api, `${n}@example.com`);
  const users = await H.api('GET', '/api/meta/users', { token: tokens.a });
  for (const u of users.body) ids[u.email[0]] = u.id;
});
after(async () => { await H.cleanup(); });

const base = () => `/api/hackathons/${hid}/projects`;

test('concurrency: two submissions racing for the same participant — one wins, no orphan', async () => {
  const [r1, r2] = await Promise.all([
    H.api('POST', base(), { token: tokens.a, body: { name: 'P-A', participants: [ids.e] } }),
    H.api('POST', base(), { token: tokens.c, body: { name: 'P-C', participants: [ids.e] } }),
  ]);
  assert.deepEqual([r1.status, r2.status].sort(), [201, 409]);

  const all = await H.api('GET', base(), { token: adminToken });
  const withE = all.body.filter((p) => p.participants.some((x) => x.id === ids.e));
  assert.equal(withE.length, 1);
  const names = all.body.map((p) => p.name);
  const loser = withE[0].name === 'P-A' ? 'P-C' : 'P-A';
  assert.ok(!names.includes(loser), 'rejected submission must not leave an orphan project');
});

test('concurrency: same judge scoring twice at once — one score row', async () => {
  const proj = await H.api('POST', base(), { token: tokens.d, body: { name: 'ToScore' } });
  const judgeId = await userIdByEmail(H.api, adminToken, 'b@example.com');
  await makeJudge(H.api, adminToken, hid, judgeId);

  const score = { presentation: 10, technical: 10, code_quality: 10, functionality: 10, innovation: 10, ux: 10 };
  const [s1, s2] = await Promise.all([
    H.api('POST', `${base()}/${proj.body.id}/score`, { token: tokens.b, body: { ...score, presentation: 15 } }),
    H.api('POST', `${base()}/${proj.body.id}/score`, { token: tokens.b, body: { ...score, presentation: 5 } }),
  ]);
  assert.equal(s1.status, 200);
  assert.equal(s2.status, 200);
  const scores = await H.api('GET', `${base()}/${proj.body.id}/scores`, { token: adminToken });
  assert.equal(scores.body.judge_count, 1);
});
