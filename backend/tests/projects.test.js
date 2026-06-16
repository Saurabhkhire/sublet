import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser, createHackathon, addTrack, addSponsor } from './helpers.js';

let H, adminToken, hid, trackId, sponsorId;
const tokens = {};
const ids = {};
before(async () => {
  H = await bootTestServer('projects');
  adminToken = await loginAdmin(H.api);
  hid = await createHackathon(H.api, adminToken, 'Proj Hack');
  trackId = await addTrack(H.api, adminToken, hid, 'AI');
  sponsorId = await addSponsor(H.api, adminToken, hid, 'OpenAI');
  for (const n of ['a', 'b', 'c', 'd']) tokens[n] = await registerUser(H.api, `${n}@example.com`);
  const users = await H.api('GET', '/api/meta/users', { token: tokens.a });
  for (const u of users.body) ids[u.email[0]] = u.id;
});
after(async () => { await H.cleanup(); });

const base = () => `/api/hackathons/${hid}/projects`;

test('create: positive - submission with participants/tracks/sponsors', async () => {
  const res = await H.api('POST', base(), {
    token: tokens.a,
    body: {
      name: 'AI Notes', short_description: 'Summarise meetings',
      demo_video_link: 'https://youtu.be/demo', git_link: 'https://github.com/x/y',
      participants: [ids.b], tracks: [trackId], sponsors: [sponsorId],
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.participants.length, 2);
  assert.equal(res.body.tracks.length, 1);
});

test('create: negative - missing name rejected', async () => {
  const res = await H.api('POST', base(), { token: tokens.c, body: { name: '' } });
  assert.equal(res.status, 400);
});

test('create: negative - participant already on another project (same hackathon)', async () => {
  const res = await H.api('POST', base(), { token: tokens.c, body: { name: 'Other', participants: [ids.b] } });
  assert.equal(res.status, 409);
});

test('list: positive - admin (judge) sees all projects', async () => {
  const list = await H.api('GET', base(), { token: adminToken });
  assert.ok(list.body.length >= 1);
});

test('list: positive - normal user sees only their own project', async () => {
  const list = await H.api('GET', base(), { token: tokens.b });
  assert.ok(list.body.every((p) => p.participants.some((x) => x.email === 'b@example.com')));
});

test('detail: negative - unrelated non-judge cannot view a project', async () => {
  const all = await H.api('GET', base(), { token: adminToken });
  const proj = all.body[0];
  const res = await H.api('GET', `${base()}/${proj.id}`, { token: tokens.d });
  assert.equal(res.status, 403);
});

test('filter: positive - judge filters projects by sponsor', async () => {
  const res = await H.api('GET', `${base()}?sponsor=${sponsorId}`, { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.every((p) => p.sponsors.some((s) => s.id === sponsorId)));
});

test('isolation: positive - same person can join a project in a different hackathon', async () => {
  const hid2 = await createHackathon(H.api, adminToken, 'Second Hack');
  const res = await H.api('POST', `/api/hackathons/${hid2}/projects`, {
    token: tokens.b, body: { name: 'B in hack 2' },
  });
  assert.equal(res.status, 201); // b was on a project in hack 1, but per-hackathon allows this
});
