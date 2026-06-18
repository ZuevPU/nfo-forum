/**
 * Sync points_config overrides and reflection level thresholds to new defaults.
 * Recalculates users.reflection_level from reflection_points.
 *
 * Usage: node backend/scripts/sync-points-config-defaults.mjs
 */
import pg from 'pg';
import { readFileSync } from 'fs';
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

const rawUrl = match[1].trim();
const connectionString = rawUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const NEW_THRESHOLDS = [0, 62, 124, 186, 248];

const RULE_PATCHES = {
  exchange_question: { pointsPerAction: 3, maxTotal: 30, maxCount: 10 },
  exchange_answer: { pointsPerAction: 3, maxTotal: 45, maxCount: 15 },
  program_main_thought: { pointsPerAction: 7, maxTotal: 7, maxCount: 1 },
  insight: { maxCount: null },
};

function calcReflectionLevel(points, thresholds) {
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, thresholds.length);
}

await client.connect();

try {
  // points_config
  const pointsRes = await client.query(
    `SELECT id, value FROM system_settings WHERE key = 'points_config' LIMIT 1`,
  );
  const existingRules =
    pointsRes.rows[0]?.value?.rules && typeof pointsRes.rows[0].value.rules === 'object'
      ? { ...pointsRes.rows[0].value.rules }
      : {};

  for (const [id, patch] of Object.entries(RULE_PATCHES)) {
    existingRules[id] = { ...(existingRules[id] ?? {}), ...patch };
  }

  const pointsValue = { rules: existingRules };
  if (pointsRes.rows[0]) {
    await client.query(`UPDATE system_settings SET value = $1, updated_at = NOW() WHERE id = $2`, [
      pointsValue,
      pointsRes.rows[0].id,
    ]);
    console.log('Updated points_config overrides:', Object.keys(RULE_PATCHES).join(', '));
  } else {
    await client.query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('points_config', $1, NOW())`,
      [pointsValue],
    );
    console.log('Inserted points_config with overrides:', Object.keys(RULE_PATCHES).join(', '));
  }

  // reflection_level_thresholds
  const thresholdsValue = { thresholds: NEW_THRESHOLDS };
  const threshRes = await client.query(
    `SELECT id FROM system_settings WHERE key = 'reflection_level_thresholds' LIMIT 1`,
  );
  if (threshRes.rows[0]) {
    await client.query(`UPDATE system_settings SET value = $1, updated_at = NOW() WHERE id = $2`, [
      thresholdsValue,
      threshRes.rows[0].id,
    ]);
  } else {
    await client.query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('reflection_level_thresholds', $1, NOW())`,
      [thresholdsValue],
    );
  }
  console.log('Set reflection_level_thresholds:', NEW_THRESHOLDS.join(', '));

  // Recalc reflection levels
  const usersRes = await client.query(
    `SELECT id, reflection_points, reflection_level FROM users`,
  );
  let updated = 0;
  for (const row of usersRes.rows) {
    const points = Number(row.reflection_points ?? 0);
    const newLevel = calcReflectionLevel(points, NEW_THRESHOLDS);
    if (newLevel !== Number(row.reflection_level)) {
      await client.query(`UPDATE users SET reflection_level = $1 WHERE id = $2`, [newLevel, row.id]);
      updated++;
    }
  }
  console.log(`Recalculated reflection_level for ${updated} user(s)`);
} finally {
  await client.end();
}
