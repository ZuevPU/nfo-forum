import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase, pool } from './db/index.js';
import { stopScheduler, startScheduler } from './services/scheduler.service.js';
import { sendAgentDebug } from './utils/agentDebug.js';

const DEBUG_RUN_ID = 'timeweb-health-hang-2026-06-19';

// #region agent log
console.info('[startup-debug 4d6e6b] boot', {
  nodeEnv: env.NODE_ENV,
  portEnv: process.env.PORT ?? null,
  resolvedPort: env.PORT,
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  hasDbHost: Boolean(process.env.DB_HOST),
});
// #endregion

// #region agent log
sendAgentDebug({
  runId: DEBUG_RUN_ID,
  hypothesisId: 'H1',
  location: 'backend/src/index.ts:9',
  message: 'Boot environment snapshot',
  data: {
    nodeEnv: env.NODE_ENV,
    portEnv: process.env.PORT ?? null,
    resolvedPort: env.PORT,
    npmLifecycleEvent: process.env.npm_lifecycle_event ?? null,
    npmCommand: process.env.npm_command ?? null,
  },
});
// #endregion

// #region agent log
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
  // #region agent log
  sendAgentDebug({
    runId: DEBUG_RUN_ID,
    hypothesisId: 'H1',
    location: 'backend/src/index.ts:33',
    message: 'Server started listening',
    data: {
      host,
      listenPort: env.PORT,
      portEnv: process.env.PORT ?? null,
    },
  });
  // #endregion
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
  // #region agent log
  sendAgentDebug({
    runId: DEBUG_RUN_ID,
    hypothesisId: 'H4',
    location: 'backend/src/index.ts:68',
    message: 'Shutdown signal received',
    data: {
      signal,
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
  // #endregion
  stopScheduler();
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
