import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { createSchema } from './schema.js';
import { migrateLegacy, migrateScores, migrateInvestment, migrateHackathonInfo, migrateSpeakerNotes, migrateSpeakerBreak, migrateJudgingGroups, migrateDemoSlots } from './migrate.js';
import { get, run, insert } from './db.js';

// Idempotent: ensures the admin account exists and (on a fresh DB) seeds one sample
// hackathon so the app isn't empty. Safe to call on every boot.
export async function ensureSeed() {
  await createSchema();
  await migrateLegacy(); // upgrade legacy single-config DBs into the multi-hackathon schema
  await migrateScores(); // upgrade old 6-category scores into the 5-category model
  await migrateInvestment(); // add the per-judge investment column if missing
  await migrateHackathonInfo(); // add support/schedule + track/sponsor description fields
  await migrateSpeakerNotes();  // add notes column to speakers
  await migrateSpeakerBreak();  // add break_after_minutes column to speakers
  await migrateJudgingGroups(); // add judge groups + award tag support
  await migrateDemoSlots();     // add demo day schedule table

  // Admin account — credentials come from the environment (defaults: admin123 / admin123).
  const adminEmail = process.env.ADMIN_EMAIL || 'admin123';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  // Find admin by role first (handles email changes), then fall back to email lookup.
  let admin = await get("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
  if (!admin) {
    admin = await get('SELECT id, email FROM users WHERE email = ?', [adminEmail]);
  }

  if (!admin) {
    const adminId = await insert('users', {
      email: adminEmail,
      password_hash: passwordHash,
      linkedin: '',
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    admin = { id: adminId };
    console.log(`[seed] created admin account (${adminEmail})`);
  } else {
    // Always sync credentials from environment so secret changes take effect on next boot.
    await run(
      'UPDATE users SET email = ?, password_hash = ? WHERE id = ?',
      [adminEmail, passwordHash, admin.id]
    );
    if (admin.email !== adminEmail) {
      console.log(`[seed] updated admin email to (${adminEmail})`);
    }
  }

  // Sample hackathon (only on a completely fresh DB).
  const anyHackathon = await get('SELECT COUNT(*) as c FROM hackathons');
  if (Number(anyHackathon.c) === 0) {
    const hid = await insert('hackathons', {
      name: 'SUBLET Demo Hackathon',
      details: 'A sample hackathon to explore SUBLET. Edit or create your own from the admin panel.',
      created_by: admin.id,
      created_at: new Date().toISOString(),
    });
    for (const name of ['AI & Agents', 'Developer Tools', 'FinTech', 'Health', 'Sustainability']) {
      await insert('tracks', { hackathon_id: hid, name });
    }
    for (const name of ['OpenAI', 'Neon', 'Vercel', 'AWS']) {
      await insert('sponsors', { hackathon_id: hid, name });
    }
    console.log('[seed] created sample "SUBLET Demo Hackathon"');
  }
}

// Allow `npm run seed` to run it directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureSeed().then(() => {
    console.log('[seed] done');
    process.exit(0);
  });
}
