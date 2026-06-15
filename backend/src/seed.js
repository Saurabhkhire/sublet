import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { createSchema } from './schema.js';
import { get, run, insert } from './db.js';

// Idempotent: ensures the admin account, a config row and a few sample
// tracks/sponsors exist. Safe to call on every boot.
export async function ensureSeed() {
  await createSchema();

  // Admin account (login: admin123 / admin123).
  const admin = await get('SELECT id FROM users WHERE email = ?', ['admin123']);
  if (!admin) {
    await insert('users', {
      email: 'admin123',
      password_hash: bcrypt.hashSync('admin123', 10),
      linkedin: '',
      role: 'admin',
      is_judge: 1,
      created_at: new Date().toISOString(),
    });
    console.log('[seed] created admin account (admin123 / admin123)');
  }

  // Config row.
  const cfg = await get('SELECT id FROM config WHERE id = 1');
  if (!cfg) {
    await run('INSERT INTO config (id, hackathon_name, details) VALUES (1, ?, ?)', [
      'My Hackathon',
      'Welcome! Build something amazing.',
    ]);
  }

  // Sample tracks / sponsors (only if both tables are empty).
  const trackCount = await get('SELECT COUNT(*) as c FROM tracks');
  if (Number(trackCount.c) === 0) {
    for (const name of ['AI & Agents', 'Developer Tools', 'FinTech', 'Health', 'Sustainability']) {
      await insert('tracks', { name });
    }
  }
  const sponsorCount = await get('SELECT COUNT(*) as c FROM sponsors');
  if (Number(sponsorCount.c) === 0) {
    for (const name of ['OpenAI', 'Neon', 'Vercel', 'AWS']) {
      await insert('sponsors', { name });
    }
  }
}

// Allow `npm run seed` to run it directly.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureSeed().then(() => {
    console.log('[seed] done');
    process.exit(0);
  });
}
