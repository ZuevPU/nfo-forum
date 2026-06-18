/**
 * Upload push mascot PNG to media_files and set system_settings.push_mascot_media_id.
 * Usage: node backend/scripts/seed-push-mascot.mjs [path-to-png]
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const env = readFileSync(envPath, 'utf8');
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error('DATABASE_URL not found in backend/.env');
  process.exit(1);
}

const defaultPng = join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'уведомления.png');
const pngPath = process.argv[2] ?? defaultPng;

if (!existsSync(pngPath)) {
  console.error(`PNG not found: ${pngPath}`);
  process.exit(1);
}

const buffer = readFileSync(pngPath);
const rawUrl = match[1].trim();
const connectionString = rawUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const [existingSetting] = (
  await client.query(`SELECT value FROM system_settings WHERE key = 'push_mascot_media_id' LIMIT 1`)
).rows;

let mediaId = existingSetting?.value;
if (typeof mediaId === 'object' && mediaId?.id) mediaId = mediaId.id;
if (typeof mediaId === 'string' && mediaId.startsWith('"')) {
  try {
    mediaId = JSON.parse(mediaId);
  } catch {
    /* keep string */
  }
}

if (mediaId && typeof mediaId === 'string') {
  const [row] = (await client.query(`SELECT id FROM media_files WHERE id = $1`, [mediaId])).rows;
  if (row) {
    console.log(`push_mascot_media_id already set: ${mediaId}`);
    await client.end();
    process.exit(0);
  }
}

mediaId = randomUUID();
await client.query(
  `INSERT INTO media_files (id, mime_type, data, size_bytes, source)
   VALUES ($1, 'image/png', $2, $3, 'push-mascot')`,
  [mediaId, buffer, buffer.length],
);

const value = JSON.stringify(mediaId);
const upsert = await client.query(
  `INSERT INTO system_settings (key, value, updated_at)
   VALUES ('push_mascot_media_id', $1::jsonb, NOW())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
   RETURNING key`,
  [value],
);

console.log(`Uploaded mascot (${buffer.length} bytes) → media id ${mediaId}`);
console.log(`system_settings.push_mascot_media_id ${upsert.rowCount ? 'saved' : 'failed'}`);

await client.end();
