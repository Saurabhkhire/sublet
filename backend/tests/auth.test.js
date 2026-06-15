import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin } from './helpers.js';

let H;
before(async () => { H = await bootTestServer('auth'); });
after(async () => { await H.cleanup(); });

test('register: positive - creates account and returns token', async () => {
  const res = await H.api('POST', '/api/auth/register', {
    body: { email: 'alice@example.com', password: 'secret123', linkedin: 'in/alice' },
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'alice@example.com');
});

test('register: negative - invalid email rejected', async () => {
  const res = await H.api('POST', '/api/auth/register', {
    body: { email: 'not-an-email', password: 'secret123' },
  });
  assert.equal(res.status, 400);
});

test('register: negative - short password rejected', async () => {
  const res = await H.api('POST', '/api/auth/register', {
    body: { email: 'bob@example.com', password: '123' },
  });
  assert.equal(res.status, 400);
});

test('register: negative - duplicate email rejected', async () => {
  await H.api('POST', '/api/auth/register', {
    body: { email: 'dup@example.com', password: 'secret123' },
  });
  const res = await H.api('POST', '/api/auth/register', {
    body: { email: 'dup@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 409);
});

test('login: positive - valid credentials succeed', async () => {
  await H.api('POST', '/api/auth/register', {
    body: { email: 'carol@example.com', password: 'secret123' },
  });
  const res = await H.api('POST', '/api/auth/login', {
    body: { email: 'carol@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('login: negative - wrong password rejected', async () => {
  await H.api('POST', '/api/auth/register', {
    body: { email: 'dave@example.com', password: 'secret123' },
  });
  const res = await H.api('POST', '/api/auth/login', {
    body: { email: 'dave@example.com', password: 'wrongpass' },
  });
  assert.equal(res.status, 401);
});

test('login: positive - admin account works', async () => {
  const token = await loginAdmin(H.api);
  assert.ok(token);
  const me = await H.api('GET', '/api/auth/me', { token });
  assert.equal(me.body.user.role, 'admin');
});

test('me: negative - no token is unauthorised', async () => {
  const res = await H.api('GET', '/api/auth/me');
  assert.equal(res.status, 401);
});
