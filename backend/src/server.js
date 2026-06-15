import express from 'express';
import cors from 'cors';
import { createSchema } from './schema.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import matchingRoutes from './routes/matching.js';
import projectRoutes from './routes/projects.js';
import judgingRoutes from './routes/judging.js';
import metaRoutes from './routes/meta.js';

export async function createApp() {
  await createSchema();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/matching', matchingRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/judging', judgingRoutes);
  app.use('/api/meta', metaRoutes);

  // Centralised error handler.
  app.use((err, _req, res, _next) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
