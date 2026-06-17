import 'express-async-errors';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { env } from './config/env.js';
import { pool } from './db/index.js';
import { validateVkSign } from './middleware/validateVkSign.js';
import { authRouter } from './routes/auth.js';
import { cronRouter } from './routes/cron.js';
import { diagnosticsRouter } from './routes/diagnostics.js';
import { eventsRouter } from './routes/events.js';
import { exchangeRouter } from './routes/exchange.js';
import { homeRouter } from './routes/home.js';
import { ratingRouter } from './routes/rating.js';
import { reflectionRouter } from './routes/reflection.js';
import { stateRouter } from './routes/state.js';
import { tasksRouter } from './routes/tasks.js';
import { adminRouter } from './routes/admin.js';
import { uploadsRouter } from './routes/uploads.js';
import { mediaRouter } from './routes/media.js';
import { notificationsRouter } from './routes/notifications.js';

const VK_HOSTING_ORIGIN = /^https:\/\/[\w-]+\.vk-apps\.com$/;
const VERCEL_ORIGIN = /^https:\/\/.*\.vercel\.app$/;
const TIMEWEB_ORIGIN = /^https:\/\/.*\.twc1\.net$/;

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === env.FRONTEND_ORIGIN) return true;
  if (origin === 'http://localhost:5173') return true;
  if (origin === 'https://vk.com' || origin === 'https://m.vk.com') return true;
  if (VERCEL_ORIGIN.test(origin)) return true;
  if (TIMEWEB_ORIGIN.test(origin)) return true;
  return VK_HOSTING_ORIGIN.test(origin);
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '12mb' }));
  app.use('/api/media', mediaRouter);
  app.use(validateVkSign);

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Health check failed:', message);
      res.status(503).json({ status: 'error', database: 'disconnected' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/home', homeRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/exchange', exchangeRouter);
  app.use('/api/reflection', reflectionRouter);
  app.use('/api/rating', ratingRouter);
  app.use('/api/state', stateRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/diagnostics', diagnosticsRouter);
  app.use('/api/cron', cronRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
