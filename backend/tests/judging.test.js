import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser } from './helpers.js';

let H, adminToken, judgeToken, ownerToken, outsiderToken, projectId;
before(async () => {
  H = await bootTestServer('judging');
  adminToken = await loginAdmin(H.api);
  ownerToken = await registerUser(H.api, 'owner@example.com');
  judgeToken = await registerUser(H.api, 'judge@example.com');
  outsiderToken = await registerUser(H.api, 'outsider@example.com');

  // Owner submits a project.
  const proj = await H.api('POST', '/api/projects', {
    token: ownerToken, body: { name: 'Judged Project', tracks: [1], sponsors: [1] },
  });
  projectId = proj.body.id;

  // Admin promotes "judge" to a judge.
  const users = await H.api('GET', '/api/admin/users', { token: adminToken });
  const judge = users.body.find((u) => u.email === 'judge@example.com');
  await H.api('PATCH', `/api/admin/users/${judge.id}`, {
    token: adminToken, body: { is_judge: true },
  });
});
after(async () => { await H.cleanup(); });

const fullScore = {
  presentation: 18, technical: 17, code_quality: 13, functionality: 14,
  innovation: 12, ux: 13, comments: 'Great work',
};

test('criteria: positive - judge fetches criteria summing to 100', async () => {
  const res = await H.api('GET', '/api/judging/criteria', { token: judgeToken });
  assert.equal(res.status, 200);
  const sum = res.body.criteria.reduce((a, c) => a + c.max, 0);
  assert.equal(sum, 100);
});

test('score: positive - judge scores a project, total computed', async () => {
  const res = await H.api('POST', `/api/judging/${projectId}/score`, {
    token: judgeToken, body: fullScore,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 18 + 17 + 13 + 14 + 12 + 13);
});

test('score: negative - non-judge cannot score', async () => {
  const res = await H.api('POST', `/api/judging/${projectId}/score`, {
    token: outsiderToken, body: fullScore,
  });
  assert.equal(res.status, 403);
});

test('score: negative - out-of-range value rejected', async () => {
  const res = await H.api('POST', `/api/judging/${projectId}/score`, {
    token: judgeToken, body: { ...fullScore, presentation: 50 },
  });
  assert.equal(res.status, 400);
});

test('score: positive - re-scoring updates rather than duplicates', async () => {
  await H.api('POST', `/api/judging/${projectId}/score`, {
    token: judgeToken, body: { ...fullScore, presentation: 10 },
  });
  const scores = await H.api('GET', `/api/judging/${projectId}/scores`, { token: adminToken });
  assert.equal(scores.body.judge_count, 1); // still one score from this judge
});

test('scores: positive - admin sees aggregate average', async () => {
  const res = await H.api('GET', `/api/judging/${projectId}/scores`, { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.average !== null);
});

test('scores: negative - outsider cannot read scores', async () => {
  const res = await H.api('GET', `/api/judging/${projectId}/scores`, { token: outsiderToken });
  assert.equal(res.status, 403);
});
