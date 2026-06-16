import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser, createHackathon, makeJudge, userIdByEmail } from './helpers.js';

let H, adminToken, judgeToken, ownerToken, outsiderToken, hid, projectId;
before(async () => {
  H = await bootTestServer('judging');
  adminToken = await loginAdmin(H.api);
  hid = await createHackathon(H.api, adminToken, 'Judge Hack');
  ownerToken = await registerUser(H.api, 'owner@example.com');
  judgeToken = await registerUser(H.api, 'judge@example.com');
  outsiderToken = await registerUser(H.api, 'outsider@example.com');

  const proj = await H.api('POST', `/api/hackathons/${hid}/projects`, {
    token: ownerToken, body: { name: 'Judged Project' },
  });
  projectId = proj.body.id;

  const judgeId = await userIdByEmail(H.api, adminToken, 'judge@example.com');
  await makeJudge(H.api, adminToken, hid, judgeId);
});
after(async () => { await H.cleanup(); });

const base = () => `/api/hackathons/${hid}/projects`;
const fullScore = { presentation: 18, technical: 17, code_quality: 13, functionality: 14, innovation: 12, ux: 13, comments: 'Great' };

test('criteria: positive - hackathon meta exposes criteria summing to 100', async () => {
  const meta = await H.api('GET', `/api/hackathons/${hid}`, { token: judgeToken });
  const sum = meta.body.score_criteria.reduce((a, c) => a + c.max, 0);
  assert.equal(sum, 100);
});

test('score: positive - judge scores a project, total computed', async () => {
  const res = await H.api('POST', `${base()}/${projectId}/score`, { token: judgeToken, body: fullScore });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 18 + 17 + 13 + 14 + 12 + 13);
});

test('score: negative - non-judge cannot score', async () => {
  const res = await H.api('POST', `${base()}/${projectId}/score`, { token: outsiderToken, body: fullScore });
  assert.equal(res.status, 403);
});

test('score: negative - out-of-range value rejected', async () => {
  const res = await H.api('POST', `${base()}/${projectId}/score`, {
    token: judgeToken, body: { ...fullScore, presentation: 50 },
  });
  assert.equal(res.status, 400);
});

test('score: positive - re-scoring updates rather than duplicates', async () => {
  await H.api('POST', `${base()}/${projectId}/score`, { token: judgeToken, body: { ...fullScore, presentation: 10 } });
  const scores = await H.api('GET', `${base()}/${projectId}/scores`, { token: adminToken });
  assert.equal(scores.body.judge_count, 1);
});

test('scores: positive - admin sees aggregate average', async () => {
  const res = await H.api('GET', `${base()}/${projectId}/scores`, { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.average !== null);
});

test('scores: negative - outsider cannot read scores', async () => {
  const res = await H.api('GET', `${base()}/${projectId}/scores`, { token: outsiderToken });
  assert.equal(res.status, 403);
});
