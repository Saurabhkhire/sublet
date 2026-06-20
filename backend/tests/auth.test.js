import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer, loginAdmin, registerUser } from './helpers.js';

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

test('register: negative - missing LinkedIn rejected', async () => {
  const res = await H.api('POST', '/api/auth/register', {
    body: { email: 'nolink@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 400);
});

test('register: negative - duplicate email rejected', async () => {
  await H.api('POST', '/api/auth/register', {
    body: { email: 'dup@example.com', password: 'secret123', linkedin: 'https://linkedin.com/in/dup' },
  });
  const res = await H.api('POST', '/api/auth/register', {
    body: { email: 'dup@example.com', password: 'secret123', linkedin: 'https://linkedin.com/in/dup' },
  });
  assert.equal(res.status, 409);
});

test('login: positive - valid credentials succeed', async () => {
  await H.api('POST', '/api/auth/register', {
    body: { email: 'carol@example.com', password: 'secret123', linkedin: 'https://linkedin.com/in/carol' },
  });
  const res = await H.api('POST', '/api/auth/login', {
    body: { email: 'carol@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('login: negative - wrong password rejected', async () => {
  await H.api('POST', '/api/auth/register', {
    body: { email: 'dave@example.com', password: 'secret123', linkedin: 'https://linkedin.com/in/dave' },
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

test('profile: positive - user updates their LinkedIn', async () => {
  const token = await registerUser(H.api, 'prof1@example.com');
  const res = await H.api('PUT', '/api/auth/profile', { token, body: { linkedin: 'https://linkedin.com/in/new' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.linkedin, 'https://linkedin.com/in/new');
});

test('profile: positive - user changes password and can log in with it', async () => {
  const token = await registerUser(H.api, 'prof2@example.com', 'oldpass1');
  const upd = await H.api('PUT', '/api/auth/profile', { token, body: { password: 'newpass1' } });
  assert.equal(upd.status, 200);
  const ok = await H.api('POST', '/api/auth/login', { body: { email: 'prof2@example.com', password: 'newpass1' } });
  assert.equal(ok.status, 200);
  const bad = await H.api('POST', '/api/auth/login', { body: { email: 'prof2@example.com', password: 'oldpass1' } });
  assert.equal(bad.status, 401);
});

test('profile: negative - short password rejected', async () => {
  const token = await registerUser(H.api, 'prof3@example.com');
  const res = await H.api('PUT', '/api/auth/profile', { token, body: { password: '123' } });
  assert.equal(res.status, 400);
});

test('profile: negative - empty LinkedIn rejected', async () => {
  const token = await registerUser(H.api, 'prof4@example.com');
  const res = await H.api('PUT', '/api/auth/profile', { token, body: { linkedin: '  ' } });
  assert.equal(res.status, 400);
});

test('profile: negative - unauthenticated cannot update', async () => {
  const res = await H.api('PUT', '/api/auth/profile', { body: { linkedin: 'x' } });
  assert.equal(res.status, 401);
});

test('me: negative - no token is unauthorised', async () => {
  const res = await H.api('GET', '/api/auth/me');
  assert.equal(res.status, 401);
});
