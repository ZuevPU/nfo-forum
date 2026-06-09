import cors from 'cors';
import express from 'express';
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

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(validateVkSign);

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
      console.error('Health check failed:', error);
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

  return app;
}
