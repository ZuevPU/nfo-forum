import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase, pool } from './db/index.js';
import { stopScheduler, startScheduler } from './services/scheduler.service.js';

// #region agent log
console.info('[startup-debug 4d6e6b] boot', {
  nodeEnv: env.NODE_ENV,
  portEnv: process.env.PORT ?? null,
  resolvedPort: env.PORT,
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  hasDbHost: Boolean(process.env.DB_HOST),
});
process.on('uncaughtException', (err) => {
  console.error('[startup-debug 4d6e6b] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[startup-debug 4d6e6b] unhandledRejection:', reason);
});
// #endregion

const app = createApp();
const host = '0.0.0.0';

const server = app.listen(env.PORT, host, () => {
  console.log(`Backend running on http://${host}:${env.PORT}`);
  startScheduler();
  void pool
    .query('SELECT 1')
    .then(() => console.info('[db] Startup connection OK'))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[db] Startup connection FAILED:', message);
    });
});

// #region agent log
server.on('error', (err) => {
  console.error('[startup-debug 4d6e6b] server listen error:', err);
});
// #endregion

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  stopScheduler();
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
