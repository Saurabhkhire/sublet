import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser } from './helpers.js';

let H, adminToken, userToken;
before(async () => {
  H = await bootTestServer('admin');
  adminToken = await loginAdmin(H.api);
  userToken = await registerUser(H.api, 'normal@example.com');
});
after(async () => { await H.cleanup(); });

test('config: positive - admin updates hackathon name & details', async () => {
  const res = await H.api('PUT', '/api/admin/config', {
    token: adminToken,
    body: { hackathon_name: 'Mega Hack', details: 'Build cool things' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.hackathon_name, 'Mega Hack');
});

test('config: negative - non-admin cannot update', async () => {
  const res = await H.api('PUT', '/api/admin/config', {
    token: userToken,
    body: { hackathon_name: 'Hacked' },
  });
  assert.equal(res.status, 403);
});

test('tracks: positive - create multiple tracks', async () => {
  const a = await H.api('POST', '/api/admin/tracks', { token: adminToken, body: { name: 'Robotics' } });
  const b = await H.api('POST', '/api/admin/tracks', { token: adminToken, body: { name: 'Gaming' } });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  const list = await H.api('GET', '/api/admin/tracks', { token: adminToken });
  assert.ok(list.body.length >= 2);
});

test('tracks: negative - empty name rejected', async () => {
  const res = await H.api('POST', '/api/admin/tracks', { token: adminToken, body: { name: '  ' } });
  assert.equal(res.status, 400);
});

test('sponsors: positive - create and delete', async () => {
  const created = await H.api('POST', '/api/admin/sponsors', {
    token: adminToken, body: { name: 'Stripe' },
  });
  assert.equal(created.status, 201);
  const del = await H.api('DELETE', `/api/admin/sponsors/${created.body.id}`, { token: adminToken });
  assert.equal(del.status, 200);
});

test('users: positive - admin grants judge permission', async () => {
  const list = await H.api('GET', '/api/admin/users', { token: adminToken });
  const normal = list.body.find((u) => u.email === 'normal@example.com');
  const res = await H.api('PATCH', `/api/admin/users/${normal.id}`, {
    token: adminToken, body: { is_judge: true },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.is_judge, 1);
});

test('users: positive - admin adds a new user', async () => {
  const res = await H.api('POST', '/api/admin/users', {
    token: adminToken, body: { email: 'added@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 201);
});

test('users: positive - admin removes a user', async () => {
  const created = await H.api('POST', '/api/admin/users', {
    token: adminToken, body: { email: 'todelete@example.com', password: 'secret123' },
  });
  const res = await H.api('DELETE', `/api/admin/users/${created.body.id}`, { token: adminToken });
  assert.equal(res.status, 200);
});

test('users: negative - admin account cannot be removed', async () => {
  const list = await H.api('GET', '/api/admin/users', { token: adminToken });
  const admin = list.body.find((u) => u.role === 'admin');
  const res = await H.api('DELETE', `/api/admin/users/${admin.id}`, { token: adminToken });
  assert.equal(res.status, 400);
});

test('users: negative - non-admin cannot list users', async () => {
  const res = await H.api('GET', '/api/admin/users', { token: userToken });
  assert.equal(res.status, 403);
});
