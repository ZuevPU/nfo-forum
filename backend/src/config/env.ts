import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function cleanEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL;
  if (direct) {
    return cleanEnvValue(direct);
  }

  const host = process.env.DB_HOST ?? process.env.PGHOST;
  const user = process.env.DB_USER ?? process.env.PGUSER;
  const password = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;
  const database = process.env.DB_NAME ?? process.env.PGDATABASE;
  const port = process.env.DB_PORT ?? process.env.PGPORT ?? '5432';

  if (host && user && password && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=require`;
  }

  throw new Error(
    'Missing DATABASE_URL or DB_HOST + DB_USER + DB_PASSWORD + DB_NAME (Timeweb: use separate vars if URL fails)',
  );
}

  // #region agent log
  fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4d6e6b'},body:JSON.stringify({sessionId:'4d6e6b',location:'env.ts:49',message:'Env config loaded',data:{PORT: process.env.PORT, DATABASE_URL: Boolean(process.env.DATABASE_URL), DB_HOST: Boolean(process.env.DB_HOST)},hypothesisId:'2',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
export const env = {
  DATABASE_URL: resolveDatabaseUrl(),
  PORT: Number(process.env.PORT ?? 3001),
  VITE_API_URL: process.env.VITE_API_URL ?? 'http://localhost:3001',
  API_PUBLIC_URL: process.env.API_PUBLIC_URL ?? process.env.VITE_API_URL ?? `http://localhost:${Number(process.env.PORT ?? 3001)}`,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  VK_APP_SECRET: process.env.VK_APP_SECRET ?? '',
  VK_GROUP_TOKEN: process.env.VK_GROUP_TOKEN ?? '',
  VK_GROUP_ID: process.env.VK_GROUP_ID ?? '',
  VK_APP_ID: process.env.VK_APP_ID ?? '54627015',
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  SKIP_VK_SIGN: process.env.SKIP_VK_SIGN === 'true',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  /** Postgres pool size. Default 10 in production; was 2 and caused queue timeouts under load. */
  DB_POOL_MAX: Number(process.env.DB_POOL_MAX ?? (process.env.NODE_ENV === 'production' ? 10 : 5)),
} as const;
