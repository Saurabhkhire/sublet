import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser } from './helpers.js';

let H, adminToken;
const tokens = {};
const ids = {};
before(async () => {
  H = await bootTestServer('projects');
  adminToken = await loginAdmin(H.api);
  for (const n of ['a', 'b', 'c', 'd']) {
    tokens[n] = await registerUser(H.api, `${n}@example.com`);
  }
  const users = await H.api('GET', '/api/meta/users', { token: tokens.a });
  for (const u of users.body) ids[u.email[0]] = u.id;
});
after(async () => { await H.cleanup(); });

test('create: positive - submission with participants/tracks/sponsors', async () => {
  const res = await H.api('POST', '/api/projects', {
    token: tokens.a,
    body: {
      name: 'AI Notes',
      short_description: 'Summarise meetings',
      demo_video_link: 'https://youtu.be/demo',
      git_link: 'https://github.com/x/y',
      participants: [ids.b],
      tracks: [1],
      sponsors: [1],
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.participants.length, 2); // creator + b
});

test('create: negative - missing name rejected', async () => {
  const res = await H.api('POST', '/api/projects', {
    token: tokens.c, body: { name: '' },
  });
  assert.equal(res.status, 400);
});

test('create: negative - participant already on another project', async () => {
  // b is already on "AI Notes"; c tries to add b again.
  const res = await H.api('POST', '/api/projects', {
    token: tokens.c, body: { name: 'Other', participants: [ids.b] },
  });
  assert.equal(res.status, 409);
});

test('list: positive - judge sees all projects', async () => {
  const list = await H.api('GET', '/api/projects', { token: adminToken });
  assert.equal(list.status, 200);
  assert.ok(list.body.length >= 1);
});

test('list: positive - normal user sees only their own project', async () => {
  const list = await H.api('GET', '/api/projects', { token: tokens.b });
  assert.equal(list.status, 200);
  assert.ok(list.body.every((p) => p.participants.some((x) => x.email === 'b@example.com')));
});

test('detail: negative - unrelated non-judge cannot view a project', async () => {
  const all = await H.api('GET', '/api/projects', { token: adminToken });
  const proj = all.body[0];
  const res = await H.api('GET', `/api/projects/${proj.id}`, { token: tokens.d });
  assert.equal(res.status, 403);
});

test('filter: positive - judge filters projects by sponsor', async () => {
  const res = await H.api('GET', '/api/projects?sponsor=1', { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.every((p) => p.sponsors.some((s) => s.id === 1)));
});
