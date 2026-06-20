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
const fullScore = { presentation: 80, execution: 90, innovation: 70, impact: 85, implementation: 75, investment: 50000, comments: 'Great' };

test('criteria: positive - hackathon meta exposes 5 categories each out of 100', async () => {
  const meta = await H.api('GET', `/api/hackathons/${hid}`, { token: judgeToken });
  const cats = meta.body.score_criteria;
  assert.equal(cats.length, 5);
  assert.ok(cats.every((c) => c.max === 100));
  assert.deepEqual(cats.map((c) => c.key), ['presentation', 'execution', 'innovation', 'impact', 'implementation']);
});

test('score: positive - judge scores a project, total is the average of the 5', async () => {
  const res = await H.api('POST', `${base()}/${projectId}/score`, { token: judgeToken, body: fullScore });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, (80 + 90 + 70 + 85 + 75) / 5); // = 80
});

test('score: negative - non-judge cannot score', async () => {
  const res = await H.api('POST', `${base()}/${projectId}/score`, { token: outsiderToken, body: fullScore });
  assert.equal(res.status, 403);
});

test('score: negative - out-of-range value rejected', async () => {
  const res = await H.api('POST', `${base()}/${projectId}/score`, {
    token: judgeToken, body: { ...fullScore, presentation: 150 },
  });
  assert.equal(res.status, 400);
});

test('list: positive - projects show average + per-category averages + my own score', async () => {
  const list = await H.api('GET', base(), { token: judgeToken });
  const scored = list.body.find((p) => p.id === projectId);
  assert.ok(scored.average_score !== null);
  assert.ok(scored.judge_count >= 1);
  // Per-category averages for the Results view.
  assert.ok(scored.category_averages && typeof scored.category_averages.execution === 'number');
  // The requesting judge's own score, for the "scored by you" indicator.
  assert.ok(typeof scored.my_score === 'number');
});

test('investment: positive - judge investment totals per project', async () => {
  const list = await H.api('GET', base(), { token: judgeToken });
  const scored = list.body.find((p) => p.id === projectId);
  assert.equal(scored.total_investment, 50000); // one judge invested 50k
  assert.equal(scored.investor_count, 1);
  assert.equal(scored.my_investment, 50000);
});

test('investment: negative - negative investment rejected', async () => {
  const res = await H.api('POST', `${base()}/${projectId}/score`, {
    token: judgeToken, body: { ...fullScore, investment: -100 },
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
