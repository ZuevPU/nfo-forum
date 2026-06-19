import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabase, pool } from './db/index.js';
import { stopScheduler, startScheduler } from './services/scheduler.service.js';

const app = createApp();

// #region agent log
fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d6e6b'},body:JSON.stringify({sessionId:'4d6e6b',location:'index.ts:24',message:'Before listen',data:{port: env.PORT, host: '0.0.0.0'},hypothesisId:'3',timestamp:Date.now()})}).catch(()=>{});
// #endregion

const host = '0.0.0.0';

const server = app.listen(env.PORT, host, () => {
  // #region agent log
  fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d6e6b'},body:JSON.stringify({sessionId:'4d6e6b',location:'index.ts:26',message:'Server listening',data:{port: env.PORT, host},hypothesisId:'1',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  console.log(`Backend running on http://${host}:${env.PORT}`);  startScheduler();
  void pool
    .query('SELECT 1')
    .then(() => console.info('[db] Startup connection OK'))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[db] Startup connection FAILED:', message);
    });
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
