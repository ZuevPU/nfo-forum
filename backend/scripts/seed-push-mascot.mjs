/**
 * Upload push mascot PNGs to media_files and set system_settings keys.
 * Usage: node backend/scripts/seed-push-mascot.mjs
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

const assetsDir = join(__dirname, '..', '..', 'frontend', 'public', 'assets');
const MASCOTS = [
  {
    key: 'push_mascot_media_id',
    path: join(assetsDir, 'уведомления.png'),
    source: 'push-mascot-nfo',
  },
  {
    key: 'push_mascot_checkin_media_id',
    path: join(assetsDir, 'чекин2.png'),
    source: 'push-mascot-checkin',
  },
];

const rawUrl = match[1].trim();
const connectionString = rawUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function parseMediaId(value) {
  let mediaId = value;
  if (typeof mediaId === 'object' && mediaId?.id) mediaId = mediaId.id;
  if (typeof mediaId === 'string' && mediaId.startsWith('"')) {
    try {
      mediaId = JSON.parse(mediaId);
    } catch {
      /* keep string */
    }
  }
  return typeof mediaId === 'string' ? mediaId : null;
}

async function ensureMascot({ key, path, source }) {
  if (!existsSync(path)) {
    console.warn(`Skip ${key}: PNG not found at ${path}`);
    return;
  }

  const [existingSetting] = (
    await client.query(`SELECT value FROM system_settings WHERE key = $1 LIMIT 1`, [key])
  ).rows;

  const existingId = parseMediaId(existingSetting?.value);
  if (existingId) {
    const [row] = (await client.query(`SELECT id FROM media_files WHERE id = $1`, [existingId])).rows;
    if (row) {
      console.log(`${key} already set: ${existingId}`);
      return;
    }
  }

  const buffer = readFileSync(path);
  const mediaId = randomUUID();
  await client.query(
    `INSERT INTO media_files (id, mime_type, data, size_bytes, source)
     VALUES ($1, 'image/png', $2, $3, $4)`,
    [mediaId, buffer, buffer.length, source],
  );

  const value = JSON.stringify(mediaId);
  await client.query(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value],
  );

  console.log(`Uploaded ${key} (${buffer.length} bytes) → media id ${mediaId}`);
}

await client.connect();

for (const mascot of MASCOTS) {
  await ensureMascot(mascot);
}

await client.end();
