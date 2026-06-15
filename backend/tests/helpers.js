// Shared test harness. Each test file gets its own throwaway SQLite database
// (node's test runner isolates each file in a separate process, so the db.js
// singleton and env vars do not leak between files).
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export async function bootTestServer(label) {
  const dbFile = path.join(os.tmpdir(), `hack-test-${label}-${process.pid}.db`);
  for (const ext of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbFile + ext); } catch {}
  }
  process.env.SQLITE_FILE = dbFile;
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = '';
  delete process.env.OPENAI_API_KEY; // force deterministic offline embeddings

  const { createApp } = await import('../src/server.js');
  const { ensureSeed } = await import('../src/seed.js');
  const app = await createApp();
  await ensureSeed();

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, p, { body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + p, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, body: json };
  }

  async function cleanup() {
    await new Promise((r) => server.close(r));
    for (const ext of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbFile + ext); } catch {}
    }
  }

  return { api, base, cleanup };
}

export async function registerUser(api, email, password = 'secret123', linkedin = '') {
  const res = await api('POST', '/api/auth/register', { body: { email, password, linkedin } });
  return res.body?.token;
}

export async function loginAdmin(api) {
  const res = await api('POST', '/api/auth/login', {
    body: { email: 'admin123', password: 'admin123' },
  });
  return res.body.token;
}
