// Add N demo users directly to the database (no running backend required).
//   node scripts/seed-users.mjs [count]
import { seedUsers } from '../backend/src/seedData.js';

const count = Number(process.env.COUNT || process.argv[2] || 50);
console.log(`Creating ${count} users…`);
try {
  const r = await seedUsers(count);
  console.log(`Done. Created ${r.created}, already existed ${r.existed}.`);
  console.log(`Login as any of them: <email> / ${r.password}  (emails are @${r.domain})`);
  process.exit(0);
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
