/**
 * Integration test: networking lunch flow on isolated test users only.
 * Usage: node backend/scripts/test-networking-lunch.mjs
 *        API_URL=http://localhost:3002 node backend/scripts/test-networking-lunch.mjs
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const env = readFileSync(envPath, 'utf8');
const dbMatch = env.match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) {
  console.error('DATABASE_URL not found in backend/.env');
  process.exit(1);
}

const API = process.env.API_URL ?? 'http://localhost:3002';
const TEST_COUNT = Number(process.env.LUNCH_TEST_COUNT ?? 100);
const TEST_PREFIX = 'lunch_test_';
const ADMIN_VK = process.env.ADMIN_VK_ID ?? 'lunch_test_admin';
const TRACK = 'НФО и образование';

const connectionString = dbMatch[1].trim().replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

function log(step, msg) {
  console.log(`${step} ${msg}`);
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function api(vkId, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Vk-Id': vkId,
      ...(options.headers ?? {}),
    },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function getTestUserIds() {
  const r = await client.query(`SELECT id, vk_id FROM users WHERE vk_id ~ '^lunch_test_[0-9]+$' ORDER BY vk_id`);
  return r.rows;
}

async function cleanupTestData() {
  const ids = (await getTestUserIds()).map((u) => u.id);
  if (ids.length === 0) return;
  await client.query(`DELETE FROM networking_lunch_applications WHERE user_id = ANY($1::int[])`, [ids]);
  await client.query(`DELETE FROM networking_lunch_assignments WHERE user_id = ANY($1::int[])`, [ids]);
  await client.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);
  await client.query(`DELETE FROM users WHERE vk_id = $1`, [ADMIN_VK]);
}

async function backupConfig() {
  const r = await client.query(`SELECT value FROM system_settings WHERE key = 'networking_lunch_config' LIMIT 1`);
  return r.rows[0]?.value ?? null;
}

async function restoreConfig(backup) {
  if (backup == null) {
    await client.query(`DELETE FROM system_settings WHERE key = 'networking_lunch_config'`);
    return;
  }
  const existing = await client.query(`SELECT id FROM system_settings WHERE key = 'networking_lunch_config' LIMIT 1`);
  if (existing.rows[0]) {
    await client.query(`UPDATE system_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'networking_lunch_config'`, [
      JSON.stringify(backup),
    ]);
  } else {
    await client.query(`INSERT INTO system_settings (key, value, updated_at) VALUES ('networking_lunch_config', $1::jsonb, NOW())`, [
      JSON.stringify(backup),
    ]);
  }
}

async function ensureTestUsers() {
  await client.query(
    `INSERT INTO users (vk_id, first_name, last_name, role, track)
     VALUES ($1, 'Тест', 'Админ', 'admin', $2)
     ON CONFLICT (vk_id) DO UPDATE SET role = 'admin'`,
    [ADMIN_VK, TRACK],
  );

  for (let i = 1; i <= TEST_COUNT; i++) {
    const vkId = `${TEST_PREFIX}${String(i).padStart(3, '0')}`;
    await client.query(
      `INSERT INTO users (vk_id, first_name, last_name, role, track)
       VALUES ($1, $2, 'Участник', 'participant', $3)
       ON CONFLICT (vk_id) DO NOTHING`,
      [vkId, `Тест${i}`, TRACK],
    );
  }

  const r = await client.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE vk_id ~ '^lunch_test_[0-9]+$'`,
  );
  return r.rows[0].n;
}

async function main() {
  console.log(`=== Networking lunch test (${TEST_COUNT} test users) ===`);
  console.log(`API: ${API}\n`);

  await client.connect();

  const health = await fetch(`${API}/health`);
  if (!health.ok) fail(`API not reachable at ${API} (start backend first)`);

  const configBackup = await backupConfig();
  log('1.', 'Cleaning previous test users…');
  await cleanupTestData();

  log('2.', `Creating ${TEST_COUNT} test users (${TEST_PREFIX}*)…`);
  const created = await ensureTestUsers();
  if (created < TEST_COUNT) fail(`Expected ${TEST_COUNT} test users, got ${created}`);
  log('2.', `OK: ${created} test users`);

  const testConfig = {
    taskTitle: '[ТЕСТ] Нетворкинг-обед',
    taskDescription: 'Тестовое задание. Нажми «Принять участие».',
    invitationText: '[ТЕСТ] Открыта регистрация на нетворкинг-обед!',
    publishHour: 12,
    publishMinute: 0,
    tableCount: 17,
    seatsPerTable: 6,
    taskId: configBackup?.taskId ?? null,
    publishedAt: null,
    invitationSentAt: null,
    assignmentsSentAt: null,
    sessionKey: `lunch_smoke_${Date.now()}`,
  };

  log('3.', 'Saving test config…');
  let r = await api(ADMIN_VK, '/api/admin/networking-lunch/config', { method: 'PUT', body: testConfig });
  if (!r.ok) fail(`save config: ${r.status} ${JSON.stringify(r.data)}`);
  log('3.', `OK: taskId=${r.data.config.taskId}`);

  log('4.', 'Send invitation (publish task)…');
  r = await api(ADMIN_VK, '/api/admin/networking-lunch/send-invitation', { method: 'POST', body: {} });
  if (!r.ok) fail(`send invitation: ${r.status} ${JSON.stringify(r.data)}`);
  log('4.', `OK: push sent=${r.data.sent ?? 0}`);

  log('5.', 'Task visible to participant…');
  r = await api(`${TEST_PREFIX}001`, '/api/tasks');
  if (!r.ok) fail(`tasks: ${r.status}`);
  const lunchTask = (r.data.tasks ?? []).find((t) => t.isNetworkingLunch);
  if (!lunchTask) fail('networking lunch task not visible');
  log('5.', `OK: «${lunchTask.title}», кнопка «Принять участие» доступна`);

  log('6.', `Apply ${TEST_COUNT} participants…`);
  let applyOk = 0;
  for (let i = 1; i <= TEST_COUNT; i++) {
    const ar = await api(`${TEST_PREFIX}${String(i).padStart(3, '0')}`, '/api/networking-lunch/apply', {
      method: 'POST',
      body: {},
    });
    if (ar.ok) applyOk++;
  }
  if (applyOk !== TEST_COUNT) fail(`apply ${applyOk}/${TEST_COUNT}`);

  r = await api(ADMIN_VK, '/api/admin/networking-lunch/applications');
  log('6.', `OK: ${r.data.total} applications in admin`);

  log('7.', 'Randomize…');
  r = await api(ADMIN_VK, '/api/admin/networking-lunch/randomize', { method: 'POST', body: {} });
  if (!r.ok) fail(`randomize: ${r.status}`);
  const seated = (r.data.tables ?? []).reduce((n, t) => n + t.seats.length, 0);
  if (seated !== TEST_COUNT) fail(`seated ${seated}/${TEST_COUNT}`);
  log('7.', `OK: ${seated} at tables`);

  log('8.', 'Before publish: no table number…');
  r = await api(`${TEST_PREFIX}050`, '/api/networking-lunch/my-status');
  if (r.data.status?.tableNumber != null) fail('table visible too early');
  log('8.', 'OK: applied, table hidden');

  log('9.', 'Publish assignments…');
  r = await api(ADMIN_VK, '/api/admin/networking-lunch/publish', { method: 'POST', body: {} });
  if (!r.ok) fail(`publish: ${r.status} ${JSON.stringify(r.data)}`);
  log('9.', `OK: sent=${r.data.sent ?? 0}`);

  log('10.', 'Participants see table…');
  for (const n of [1, 50, 100]) {
    const vkId = `${TEST_PREFIX}${String(n).padStart(3, '0')}`;
    const tr = await api(vkId, '/api/tasks');
    const lt = (tr.data.tasks ?? []).find((t) => t.isNetworkingLunch);
    if (lt?.lunchTableNumber == null) fail(`${vkId}: no lunchTableNumber in tasks`);
    log('10.', `  ${vkId} → стол № ${lt.lunchTableNumber}`);
  }

  log('11.', 'Cleanup…');
  await cleanupTestData();
  await restoreConfig(configBackup);
  log('11.', 'OK');

  console.log('\n=== NETWORKING LUNCH TEST PASSED ===');
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  try {
    const configBackup = await backupConfig().catch(() => null);
    await cleanupTestData();
    if (configBackup) await restoreConfig(configBackup);
  } catch {
    /* ignore cleanup errors */
  }
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
