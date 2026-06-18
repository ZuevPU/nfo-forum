import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase } from './db/index.js';
import { stopScheduler, startScheduler } from './services/scheduler.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
  startScheduler();
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
