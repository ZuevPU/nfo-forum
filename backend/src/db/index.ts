import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

function buildConnectionString(): string {
  let url = env.DATABASE_URL;
  if (url.includes('pooler.supabase.com:5432')) {
    url = url.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}uselibpqcompat=true&pgbouncer=true`;
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  ...({ prepare: false } as object),
});

pool.on('error', (err) => {
  console.error('[db] Idle client error (pool will recover):', err.message);
});

export const db = drizzle(pool, { schema });
export { pool };

export type Database = typeof db;

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
