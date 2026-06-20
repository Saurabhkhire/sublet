import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser, createHackathon } from './helpers.js';

let H, adminToken, hid;
const tokens = {};
before(async () => {
  H = await bootTestServer('matching');
  adminToken = await loginAdmin(H.api);
  hid = await createHackathon(H.api, adminToken, 'Match Hack');
  for (const name of ['p1', 'p2', 'p3', 'p4', 'p5']) {
    tokens[name] = await registerUser(H.api, `${name}@example.com`);
  }
});
after(async () => { await H.cleanup(); });

const base = () => `/api/hackathons/${hid}/matching`;
function profile(role, plan) {
  return { role, plan_to_build: plan, tracks: [], sponsors: [] };
}

test('profile: positive - user opts into matching', async () => {
  const res = await H.api('POST', `${base()}/profile`, {
    token: tokens.p1, body: profile('Backend Engineer', 'A tool to summarise PDFs with AI'),
  });
  assert.equal(res.status, 201);
});

test('profile: negative - missing role/plan rejected', async () => {
  const res = await H.api('POST', `${base()}/profile`, {
    token: tokens.p2, body: { role: '', plan_to_build: '' },
  });
  assert.equal(res.status, 400);
});

test('profiles: negative - non-admin cannot list opt-ins', async () => {
  const res = await H.api('GET', `${base()}/profiles`, { token: tokens.p1 });
  assert.equal(res.status, 403);
});

test('run: positive - admin triggers matching into groups of <=4', async () => {
  await H.api('POST', `${base()}/profile`, { token: tokens.p2, body: profile('Product Manager', 'summarise documents with AI') });
  await H.api('POST', `${base()}/profile`, { token: tokens.p3, body: profile('UX Designer', 'AI assistant for PDFs') });
  await H.api('POST', `${base()}/profile`, { token: tokens.p4, body: profile('AI/ML Engineer', 'LLM document summariser') });
  await H.api('POST', `${base()}/profile`, { token: tokens.p5, body: profile('Frontend Engineer', 'chat over your PDFs') });

  const res = await H.api('POST', `${base()}/run`, { token: adminToken });
  assert.equal(res.status, 200);
  for (const g of res.body.groups) assert.ok(g.members.length <= 4);
  const total = res.body.groups.reduce((a, g) => a + g.members.length, 0);
  assert.equal(total, 5);
});

test('run: negative - re-running with no new opt-ins is rejected', async () => {
  const res = await H.api('POST', `${base()}/run`, { token: adminToken });
  assert.equal(res.status, 400);
});

test('profile: negative - already-matched user cannot edit profile', async () => {
  const res = await H.api('POST', `${base()}/profile`, {
    token: tokens.p1, body: profile('Backend Engineer', 'changed plan'),
  });
  assert.equal(res.status, 409);
});

test('run: positive - only NEW opt-ins matched on a second run', async () => {
  const t6 = await registerUser(H.api, 'p6@example.com');
  const t7 = await registerUser(H.api, 'p7@example.com');
  await H.api('POST', `${base()}/profile`, { token: t6, body: profile('Designer', 'new idea') });
  await H.api('POST', `${base()}/profile`, { token: t7, body: profile('Data Scientist', 'another idea') });
  const res = await H.api('POST', `${base()}/run`, { token: adminToken });
  assert.equal(res.status, 200);
  const total = res.body.groups.reduce((a, g) => a + g.members.length, 0);
  assert.equal(total, 2);
});

test('me: positive - matched user sees their group', async () => {
  const res = await H.api('GET', `${base()}/me`, { token: tokens.p1 });
  assert.equal(res.status, 200);
  assert.equal(res.body.profile.matched, 1);
  assert.ok(res.body.group.length >= 1);
});

test('participants: positive - opted-in user sees other opted-in profiles', async () => {
  const res = await H.api('GET', `${base()}/participants`, { token: tokens.p1 });
  assert.equal(res.status, 200);
  assert.ok(res.body.length >= 2);
  // Each entry exposes role + plan + contact for finding teammates.
  assert.ok(res.body.every((p) => p.role && 'email' in p));
});

test('participants: negative - user who did NOT opt in cannot see others', async () => {
  const outsider = await registerUser(H.api, 'no-optin@example.com');
  const res = await H.api('GET', `${base()}/participants`, { token: outsider });
  assert.equal(res.status, 403);
});

test('isolation: negative - matching is scoped per hackathon', async () => {
  const hid2 = await createHackathon(H.api, adminToken, 'Other Hack');
  const me = await H.api('GET', `/api/hackathons/${hid2}/matching/me`, { token: tokens.p1 });
  assert.equal(me.body.profile, null); // p1 opted into the first hackathon, not this one
});
