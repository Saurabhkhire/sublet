import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser, createHackathon, userIdByEmail } from './helpers.js';

let H, adminToken, userToken, hid;
before(async () => {
  H = await bootTestServer('hackathons');
  adminToken = await loginAdmin(H.api);
  userToken = await registerUser(H.api, 'u@example.com');
  hid = await createHackathon(H.api, adminToken, 'Ziward Hackathon', 'Details here');
});
after(async () => { await H.cleanup(); });

test('hackathon: positive - admin creates a hackathon', async () => {
  const res = await H.api('POST', '/api/hackathons', {
    token: adminToken, body: { name: 'Another Hack', details: 'x' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.name, 'Another Hack');
});

test('hackathon: negative - non-admin cannot create', async () => {
  const res = await H.api('POST', '/api/hackathons', { token: userToken, body: { name: 'Nope' } });
  assert.equal(res.status, 403);
});

test('hackathon: negative - empty name rejected', async () => {
  const res = await H.api('POST', '/api/hackathons', { token: adminToken, body: { name: '  ' } });
  assert.equal(res.status, 400);
});

test('hackathon: positive - anyone authenticated can list and open meta', async () => {
  const list = await H.api('GET', '/api/hackathons', { token: userToken });
  assert.equal(list.status, 200);
  assert.ok(list.body.length >= 1);
  const meta = await H.api('GET', `/api/hackathons/${hid}`, { token: userToken });
  assert.equal(meta.status, 200);
  assert.equal(meta.body.hackathon.name, 'Ziward Hackathon');
  assert.ok(Array.isArray(meta.body.roles));
});

test('hackathon: positive - admin edits details', async () => {
  const res = await H.api('PUT', `/api/hackathons/${hid}`, {
    token: adminToken, body: { name: 'Ziward Hackathon', details: 'Updated' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.details, 'Updated');
});

test('tracks/sponsors: positive - admin manages multiple entries', async () => {
  const t1 = await H.api('POST', `/api/hackathons/${hid}/tracks`, { token: adminToken, body: { name: 'AI' } });
  const t2 = await H.api('POST', `/api/hackathons/${hid}/tracks`, { token: adminToken, body: { name: 'Web' } });
  assert.equal(t1.status, 201);
  assert.equal(t2.status, 201);
  const s1 = await H.api('POST', `/api/hackathons/${hid}/sponsors`, { token: adminToken, body: { name: 'OpenAI' } });
  assert.equal(s1.status, 201);
  const tracks = await H.api('GET', `/api/hackathons/${hid}/tracks`, { token: userToken });
  assert.ok(tracks.body.length >= 2);
});

test('tracks: negative - empty name rejected; non-admin cannot add', async () => {
  const empty = await H.api('POST', `/api/hackathons/${hid}/tracks`, { token: adminToken, body: { name: '' } });
  assert.equal(empty.status, 400);
  const forbidden = await H.api('POST', `/api/hackathons/${hid}/tracks`, { token: userToken, body: { name: 'X' } });
  assert.equal(forbidden.status, 403);
});

test('judges: positive - admin grants and revokes view/judge access', async () => {
  const uid = await userIdByEmail(H.api, adminToken, 'u@example.com');
  const add = await H.api('POST', `/api/hackathons/${hid}/judges`, { token: adminToken, body: { user_id: uid } });
  assert.equal(add.status, 201);
  const judges = await H.api('GET', `/api/hackathons/${hid}/judges`, { token: adminToken });
  assert.ok(judges.body.some((j) => j.id === uid));
  const del = await H.api('DELETE', `/api/hackathons/${hid}/judges/${uid}`, { token: adminToken });
  assert.equal(del.status, 200);
});

test('reset: positive - admin clears all projects + judge data for a hackathon', async () => {
  // Create a project then reset.
  const owner = await registerUser(H.api, 'owner-reset@example.com');
  await H.api('POST', `/api/hackathons/${hid}/projects`, { token: owner, body: { name: 'Temp' } });
  let list = await H.api('GET', `/api/hackathons/${hid}/projects`, { token: adminToken });
  assert.ok(list.body.length >= 1);
  const reset = await H.api('POST', `/api/hackathons/${hid}/reset`, { token: adminToken });
  assert.equal(reset.status, 200);
  list = await H.api('GET', `/api/hackathons/${hid}/projects`, { token: adminToken });
  assert.equal(list.body.length, 0);
});

test('reset: negative - non-admin cannot reset', async () => {
  const res = await H.api('POST', `/api/hackathons/${hid}/reset`, { token: userToken });
  assert.equal(res.status, 403);
});

test('hackathon: negative - unknown hackathon returns 404', async () => {
  const res = await H.api('GET', '/api/hackathons/99999', { token: userToken });
  assert.equal(res.status, 404);
});
