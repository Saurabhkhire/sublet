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

test('users: positive - admin lists global users', async () => {
  const res = await H.api('GET', '/api/admin/users', { token: adminToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.length >= 1);
});

test('users: positive - admin adds a new user', async () => {
  const res = await H.api('POST', '/api/admin/users', {
    token: adminToken, body: { email: 'added@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 201);
});

test('users: negative - duplicate email rejected', async () => {
  const res = await H.api('POST', '/api/admin/users', {
    token: adminToken, body: { email: 'normal@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 409);
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
