// Add N demo project submissions directly to the database (no running backend required).
// Each project is created by a distinct seeded user — run seed-users.mjs first.
//   node scripts/seed-projects.mjs [count]
import { seedProjects } from '../backend/src/seedData.js';

const count = Number(process.env.COUNT || process.argv[2] || 50);
try {
  const r = await seedProjects(count);
  console.log(`Done in "${r.hackathon}". Created ${r.created}, skipped ${r.skipped} (already had a project).`);
  if (r.available_users < count) {
    console.log(`Note: only ${r.available_users} seeded user(s) exist — run "npm run seed:users ${count}" first to get ${count} projects.`);
  }
  process.exit(0);
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
