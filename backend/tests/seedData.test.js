import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootTestServer } from './helpers.js';

// The demo scripts seed straight into the DB (no HTTP). This verifies that path.
let H;
before(async () => { H = await bootTestServer('seeddata'); });
after(async () => { await H.cleanup(); });

test('seedData: creates users and projects directly, idempotently', async () => {
  const { seedUsers, seedProjects } = await import('../src/seedData.js');

  const u = await seedUsers(4);
  assert.equal(u.created, 4);
  assert.equal(u.existed, 0);

  const p = await seedProjects(4);
  assert.equal(p.created, 4); // one project per seeded user
  assert.equal(p.skipped, 0);

  // Re-running is safe: users already exist, projects already assigned.
  const u2 = await seedUsers(4);
  assert.equal(u2.created, 0);
  assert.equal(u2.existed, 4);
  const p2 = await seedProjects(4);
  assert.equal(p2.created, 0);
  assert.equal(p2.skipped, 4);
});
