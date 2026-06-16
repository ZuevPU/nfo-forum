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
// Timeweb uses self-signed certs; strip sslmode from URL and pass ssl explicitly.
const connectionString = rawUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function colExists(table, col) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, col],
  );
  return (r.rowCount ?? 0) > 0;
}

async function tableExists(table) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return (r.rowCount ?? 0) > 0;
}

await client.connect();

const checks = {
  users_notification_prefs: await colExists('users', 'notification_prefs'),
  users_last_seen_exchange_at: await colExists('users', 'last_seen_exchange_at'),
  events_reminder_sent_at: await colExists('events', 'reminder_sent_at'),
  task_networking_queue: await tableExists('task_networking_queue'),
  reflection_questions_notification_sent_at: await colExists(
    'reflection_questions',
    'notification_sent_at',
  ),
  exchange_reports: await tableExists('exchange_reports'),
  exchange_questions_answers_collected_notified_at: await colExists(
    'exchange_questions',
    'answers_collected_notified_at',
  ),
};

console.log('Current state:');
for (const [key, ok] of Object.entries(checks)) {
  console.log(`  ${ok ? '✓' : '✗'} ${key}`);
}

const statements = [];
if (!checks.users_notification_prefs) {
  statements.push('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs jsonb');
}
if (!checks.events_reminder_sent_at) {
  statements.push('ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp');
}
if (!checks.task_networking_queue) {
  statements.push(`CREATE TABLE IF NOT EXISTS task_networking_queue (
  id serial PRIMARY KEY,
  task_id integer NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamp NOT NULL DEFAULT now()
)`);
  statements.push(
    'CREATE INDEX IF NOT EXISTS idx_task_networking_task_status ON task_networking_queue (task_id, status)',
  );
}
if (!checks.reflection_questions_notification_sent_at) {
  statements.push(
    'ALTER TABLE reflection_questions ADD COLUMN IF NOT EXISTS notification_sent_at timestamp',
  );
}
if (!checks.exchange_reports) {
  statements.push(`CREATE TABLE IF NOT EXISTS exchange_reports (
  id serial PRIMARY KEY,
  answer_id integer NOT NULL REFERENCES exchange_answers(id) ON DELETE CASCADE,
  reporter_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now()
)`);
}
if (!checks.users_last_seen_exchange_at) {
  statements.push('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_exchange_at timestamp');
}
if (!checks.exchange_questions_answers_collected_notified_at) {
  statements.push(
    'ALTER TABLE exchange_questions ADD COLUMN IF NOT EXISTS answers_collected_notified_at timestamp',
  );
}

if (statements.length === 0) {
  console.log('\nAll migrations already applied. Nothing to do.');
} else {
  console.log(`\nApplying ${statements.length} statement(s)...`);
  for (const sql of statements) {
    await client.query(sql);
    console.log('OK:', sql.split('\n')[0]);
  }
  console.log('\nDone.');
}

await client.end();
