// Direct-to-database seeding used by the demo scripts. This works WITHOUT the backend server
// running: it opens the same database the API uses and writes through the shared db layer
// (creating the schema/admin/sample hackathon first if needed).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load backend/.env so a configured DATABASE_URL / SQLITE_FILE is honoured. `override: false`
// means it never clobbers vars already set (e.g. by the test harness).
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import db AFTER env is configured so it selects the right engine/connection.
const { get, all, insert, run } = await import('./db.js');
const { ensureSeed } = await import('./seed.js');

const SEED_DOMAIN = process.env.SEED_DOMAIN || 'sublet.test';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'password123';
const seedEmail = (i) => `seeduser${String(i).padStart(3, '0')}@${SEED_DOMAIN}`;

export async function seedUsers(count = 50) {
  await ensureSeed();
  let created = 0;
  let existed = 0;
  for (let i = 1; i <= count; i++) {
    const email = seedEmail(i);
    if (await get('SELECT id FROM users WHERE email = ?', [email])) { existed++; continue; }
    await insert('users', {
      email,
      password_hash: bcrypt.hashSync(SEED_PASSWORD, 10),
      linkedin: `https://linkedin.com/in/seeduser${i}`,
      role: 'user',
      created_at: new Date().toISOString(),
    });
    created++;
  }
  return { created, existed, password: SEED_PASSWORD, domain: SEED_DOMAIN };
}

async function resolveHackathon() {
  const target = process.env.HACKATHON || 'Ziward Hackathon';
  let h = /^\d+$/.test(target)
    ? await get('SELECT * FROM hackathons WHERE id = ?', [Number(target)])
    : await get('SELECT * FROM hackathons WHERE name = ?', [target]);
  if (!h) h = await get('SELECT * FROM hackathons ORDER BY id LIMIT 1');
  return h;
}

export async function seedProjects(count = 50) {
  await ensureSeed();
  const h = await resolveHackathon();
  if (!h) throw new Error('No hackathon exists yet — create one in the app first.');

  const tracks = (await all('SELECT id FROM tracks WHERE hackathon_id = ?', [h.id])).map((t) => t.id);
  const sponsors = (await all('SELECT id FROM sponsors WHERE hackathon_id = ?', [h.id])).map((s) => s.id);
  // Each project is created by a distinct seeded user (one project per person per hackathon).
  const users = await all('SELECT id FROM users WHERE email LIKE ? ORDER BY email', [`%@${SEED_DOMAIN}`]);

  let created = 0;
  let skipped = 0;
  let i = 0;
  for (const u of users) {
    if (created >= count) break;
    i++;
    const onProject = await get(
      'SELECT 1 FROM project_participants WHERE hackathon_id = ? AND user_id = ?',
      [h.id, u.id]
    );
    if (onProject) { skipped++; continue; }
    const pid = await insert('projects', {
      hackathon_id: h.id,
      name: `[seed] Project ${String(i).padStart(3, '0')}`,
      short_description: `Auto-generated demo project #${i}`,
      demo_video_link: `https://example.com/demo/${i}`,
      git_link: `https://github.com/sublet-seed/project-${i}`,
      created_by: u.id,
      created_at: new Date().toISOString(),
    });
    await insert('project_participants', { hackathon_id: h.id, project_id: pid, user_id: u.id });
    if (tracks.length) await run('INSERT INTO project_tracks (project_id, track_id) VALUES (?, ?)', [pid, tracks[i % tracks.length]]);
    if (sponsors.length) await run('INSERT INTO project_sponsors (project_id, sponsor_id) VALUES (?, ?)', [pid, sponsors[i % sponsors.length]]);
    created++;
  }
  return { hackathon: h.name, created, skipped, available_users: users.length };
}
