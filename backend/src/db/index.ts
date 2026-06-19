import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

function stripSslModeParam(url: string): string {
  return url
    .replace(/([?&])sslmode=[^&]*(&|$)/, (_, prefix, suffix) => (suffix === '&' ? prefix : ''))
    .replace(/\?$/, '');
}

function parseConnectionTarget(url: string): { host: string; port: string; user: string; database: string } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username),
      database: parsed.pathname.replace(/^\//, '') || '(none)',
    };
  } catch {
    return { host: '?', port: '?', user: '?', database: '?' };
  }
}

function buildConnectionString(): string {
  const url = env.DATABASE_URL;
  // Supabase pooler only — pgbouncer params break direct Postgres (e.g. Timeweb).
  if (!url.includes('supabase.com')) {
    return stripSslModeParam(url);
  }
  let poolerUrl = url;
  if (poolerUrl.includes('pooler.supabase.com:5432')) {
    poolerUrl = poolerUrl.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  }
  const separator = poolerUrl.includes('?') ? '&' : '?';
  return `${poolerUrl}${separator}uselibpqcompat=true&pgbouncer=true`;
}

export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: env.DB_POOL_MAX,
  };
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  ssl: { rejectUnauthorized: false },
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  ...({ prepare: false } as object),
});

pool.on('error', (err) => {
  console.error('[db] Idle client error (pool will recover):', err.message);
});

if (env.NODE_ENV === 'production') {
  const target = parseConnectionTarget(env.DATABASE_URL);
  console.info(
    `[db] Pool max=${env.DB_POOL_MAX}, target=${target.user}@${target.host}:${target.port}/${target.database}`,
  );
}

export const db = drizzle(pool, { schema });
export { pool };

export type Database = typeof db;

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
