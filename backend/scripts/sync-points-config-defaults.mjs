/**
 * Sync points_config overrides, reflection thresholds, insights defaults,
 * program-main-thought question, and unpublish program-insights duplicates.
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
  exchange_question: { pointsPerAction: 3, maxTotal: 30, maxCount: null },
  exchange_answer: { pointsPerAction: 3, maxTotal: 45, maxCount: null },
  program_main_thought: { pointsPerAction: 7, maxTotal: 7, maxCount: 1 },
  insight: { maxCount: null },
};

const DEFAULT_INSIGHTS_SETTINGS = {
  prompt: 'Зафиксируй озарение или важную мысль по ходу программы.',
  placeholder: 'Что важного понял(а) или заметил(а)...',
};

const PROGRAM_MAIN_THOUGHT = {
  groupId: 'program-main-thought',
  text: 'Какая главная мысль или вывод у тебя по итогам всей программы?',
  type: 'reflection',
  points: 7,
  /** 20 июня 2026, 10:00 МСK ≈ 07:00 UTC */
  publishTime: '2026-06-20T07:00:00.000Z',
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

  // exchange_slots (only if missing)
  const exchangeRes = await client.query(
    `SELECT id FROM system_settings WHERE key = 'exchange_slots' LIMIT 1`,
  );
  if (!exchangeRes.rows[0]) {
    await client.query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('exchange_slots', $1, NOW())`,
      [['08:15', '13:15']],
    );
    console.log('Inserted default exchange_slots: 08:15, 13:15');
  } else {
    console.log('exchange_slots already exists, skipped');
  }

  // insights_settings (only if missing)
  const insightsRes = await client.query(
    `SELECT id FROM system_settings WHERE key = 'insights_settings' LIMIT 1`,
  );
  if (!insightsRes.rows[0]) {
    await client.query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('insights_settings', $1, NOW())`,
      [DEFAULT_INSIGHTS_SETTINGS],
    );
    console.log('Inserted default insights_settings');
  } else {
    console.log('insights_settings already exists, skipped');
  }

  // Unpublish duplicate program-insights reflection questions (participants use ProgramInsightsSection)
  const draftInsights = await client.query(
    `UPDATE reflection_questions SET status = 'draft'
     WHERE group_id = 'program-insights' OR type = 'insight'
     RETURNING id`,
  );
  if (draftInsights.rowCount > 0) {
    console.log(`Set ${draftInsights.rowCount} program-insights question(s) to draft`);
  }

  // program-main-thought question (create if missing)
  const mainThoughtRes = await client.query(
    `SELECT id FROM reflection_questions WHERE group_id = $1 LIMIT 1`,
    [PROGRAM_MAIN_THOUGHT.groupId],
  );
  if (!mainThoughtRes.rows[0]) {
    await client.query(
      `INSERT INTO reflection_questions
        (text, type, group_id, points, publish_time, status, send_notification, allow_multiple)
       VALUES ($1, $2, $3, $4, $5, 'published', true, false)`,
      [
        PROGRAM_MAIN_THOUGHT.text,
        PROGRAM_MAIN_THOUGHT.type,
        PROGRAM_MAIN_THOUGHT.groupId,
        PROGRAM_MAIN_THOUGHT.points,
        PROGRAM_MAIN_THOUGHT.publishTime,
      ],
    );
    console.log('Created reflection question program-main-thought');
  } else {
    console.log('program-main-thought question already exists, skipped');
  }
} finally {
  await client.end();
}
