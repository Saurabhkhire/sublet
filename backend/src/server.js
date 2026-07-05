import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createSchema } from './schema.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import hackathonRoutes from './routes/hackathons.js';
import matchingRoutes from './routes/matching.js';
import projectRoutes from './routes/projects.js';
import speakerRoutes from './routes/speakers.js';
import judgingGroupRoutes from './routes/judging-groups.js';
import demoSlotRoutes from './routes/demo-slots.js';
import metaRoutes from './routes/meta.js';
import smtpRoutes from './routes/smtp.js';
import emailRoutes from './routes/emails.js';
import aiRoutes from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  await createSchema();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/hackathons', hackathonRoutes);
  app.use('/api/hackathons/:hid/matching', matchingRoutes);
  app.use('/api/hackathons/:hid/projects', projectRoutes);
  app.use('/api/hackathons/:hid/speakers', speakerRoutes);
  app.use('/api/hackathons/:hid/judging-groups', judgingGroupRoutes);
  app.use('/api/hackathons/:hid/demo-slots', demoSlotRoutes);
  app.use('/api/hackathons/:hid/emails', emailRoutes);
  app.use('/api/hackathons/:hid/ai', aiRoutes);
  app.use('/api/smtp-config', smtpRoutes);

  app.use((err, _req, res, _next) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
