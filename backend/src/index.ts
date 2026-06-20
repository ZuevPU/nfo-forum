import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase, pool } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { stopScheduler, startScheduler } from './services/scheduler.service.js';

const app = createApp();
const host = '0.0.0.0';

const server = app.listen(env.PORT, host, () => {
  console.log(`Backend running on http://${host}:${env.PORT}`);
  startScheduler();
  void pool
    .query('SELECT 1')
    .then(() => console.info('[db] Startup connection OK'))
    .then(() => runMigrations())
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[db] Startup connection FAILED:', message);
    });
});

server.on('error', (err) => {
  console.error('Server listen error:', err);
});

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
