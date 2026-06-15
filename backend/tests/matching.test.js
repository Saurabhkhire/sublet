import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser } from './helpers.js';

let H, adminToken;
const tokens = {};
before(async () => {
  H = await bootTestServer('matching');
  adminToken = await loginAdmin(H.api);
  for (const name of ['p1', 'p2', 'p3', 'p4', 'p5']) {
    tokens[name] = await registerUser(H.api, `${name}@example.com`);
  }
});
after(async () => { await H.cleanup(); });

function profile(role, plan) {
  return { role, plan_to_build: plan, tracks: [1], sponsors: [1] };
}

test('profile: positive - user opts into matching', async () => {
  const res = await H.api('POST', '/api/matching/profile', {
    token: tokens.p1, body: profile('Backend Engineer', 'A tool to summarise PDFs with AI'),
  });
  assert.equal(res.status, 201);
});

test('profile: negative - missing role/plan rejected', async () => {
  const res = await H.api('POST', '/api/matching/profile', {
    token: tokens.p2, body: { role: '', plan_to_build: '' },
  });
  assert.equal(res.status, 400);
});

test('profiles: negative - non-admin cannot list opt-ins', async () => {
  const res = await H.api('GET', '/api/matching/profiles', { token: tokens.p1 });
  assert.equal(res.status, 403);
});

test('run: positive - admin triggers matching into groups of <=4', async () => {
  // p1 already opted in; add p2..p5 with varied roles.
  await H.api('POST', '/api/matching/profile', {
    token: tokens.p2, body: profile('Product Manager', 'A tool to summarise documents using AI'),
  });
  await H.api('POST', '/api/matching/profile', {
    token: tokens.p3, body: profile('UX Designer', 'AI assistant that reads PDFs and answers questions'),
  });
  await H.api('POST', '/api/matching/profile', {
    token: tokens.p4, body: profile('AI/ML Engineer', 'A document summariser powered by LLMs'),
  });
  await H.api('POST', '/api/matching/profile', {
    token: tokens.p5, body: profile('Frontend Engineer', 'Chat over your PDFs with AI'),
  });

  const res = await H.api('POST', '/api/matching/run', { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.groups.length >= 1);
  for (const g of res.body.groups) assert.ok(g.members.length <= 4);
  // All 5 people should be matched.
  const total = res.body.groups.reduce((a, g) => a + g.members.length, 0);
  assert.equal(total, 5);
});

test('run: negative - re-running with no new opt-ins is rejected', async () => {
  const res = await H.api('POST', '/api/matching/run', { token: adminToken });
  assert.equal(res.status, 400);
});

test('profile: negative - already-matched user cannot edit profile', async () => {
  const res = await H.api('POST', '/api/matching/profile', {
    token: tokens.p1, body: profile('Backend Engineer', 'changed plan'),
  });
  assert.equal(res.status, 409);
});

test('run: positive - only NEW opt-ins are matched on a second run', async () => {
  const t6 = await registerUser(H.api, 'p6@example.com');
  const t7 = await registerUser(H.api, 'p7@example.com');
  await H.api('POST', '/api/matching/profile', { token: t6, body: profile('Designer', 'A new idea') });
  await H.api('POST', '/api/matching/profile', { token: t7, body: profile('Data Scientist', 'Another idea') });

  const res = await H.api('POST', '/api/matching/run', { token: adminToken });
  assert.equal(res.status, 200);
  const total = res.body.groups.reduce((a, g) => a + g.members.length, 0);
  assert.equal(total, 2); // only the 2 newcomers, not the earlier 5
});

test('me: positive - matched user sees their group', async () => {
  const res = await H.api('GET', '/api/matching/me', { token: tokens.p1 });
  assert.equal(res.status, 200);
  assert.equal(res.body.profile.matched, 1);
  assert.ok(res.body.group.length >= 1);
});
