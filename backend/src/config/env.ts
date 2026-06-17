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

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
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
} as const;
