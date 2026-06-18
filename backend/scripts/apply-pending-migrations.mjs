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
  reflection_questions_allow_multiple: await colExists(
    'reflection_questions',
    'allow_multiple',
  ),
  tasks_networking_contacts: await colExists('tasks', 'networking_contacts'),
  user_notifications: await tableExists('user_notifications'),
  exchange_assignments_deferred_at: await colExists('exchange_assignments', 'deferred_at'),
  diagnostic_profile_feedback: await tableExists('diagnostic_profile_feedback'),
  reflection_questions_status: await colExists('reflection_questions', 'status'),
  tasks_status: await colExists('tasks', 'status'),
  tasks_publish_time: await colExists('tasks', 'publish_time'),
  tasks_photo_mode: await colExists('tasks', 'photo_mode'),
  nfo_day_reflections_answers: await colExists('nfo_day_reflections', 'answers'),
  program_insights: await tableExists('program_insights'),
  media_files: await tableExists('media_files'),
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
if (!checks.reflection_questions_allow_multiple) {
  statements.push(
    'ALTER TABLE reflection_questions ADD COLUMN IF NOT EXISTS allow_multiple boolean NOT NULL DEFAULT false',
  );
}
if (!checks.tasks_networking_contacts) {
  statements.push(
    'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS networking_contacts integer NOT NULL DEFAULT 1',
  );
}
if (!checks.user_notifications) {
  statements.push(`CREATE TABLE IF NOT EXISTS user_notifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text,
  link_hash text,
  link_label text,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
)`);
  statements.push(
    'CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications (user_id, read_at)',
  );
  statements.push(
    'CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON user_notifications (user_id, created_at)',
  );
}
if (!checks.exchange_assignments_deferred_at) {
  statements.push('ALTER TABLE exchange_assignments ADD COLUMN IF NOT EXISTS deferred_at timestamp');
}
if (!checks.diagnostic_profile_feedback) {
  statements.push(`CREATE TABLE IF NOT EXISTS diagnostic_profile_feedback (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  comment text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
)`);
  statements.push(
    'CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_profile_feedback_user_attempt ON diagnostic_profile_feedback (user_id, attempt_number)',
  );
}
if (!checks.reflection_questions_status) {
  statements.push(
    "ALTER TABLE reflection_questions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'",
  );
  statements.push('ALTER TABLE reflection_questions ALTER COLUMN publish_time DROP NOT NULL');
}
if (!checks.tasks_status) {
  statements.push("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'");
}
if (!checks.tasks_publish_time) {
  statements.push('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS publish_time timestamp');
  statements.push('UPDATE tasks SET publish_time = created_at WHERE publish_time IS NULL');
}
if (!checks.tasks_photo_mode) {
  statements.push("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS photo_mode text NOT NULL DEFAULT 'none'");
  statements.push("UPDATE tasks SET photo_mode = 'required' WHERE requires_photo = true");
  statements.push("UPDATE tasks SET photo_mode = 'none' WHERE requires_photo = false AND photo_mode = 'none'");
}
if (!checks.nfo_day_reflections_answers) {
  statements.push('ALTER TABLE nfo_day_reflections ADD COLUMN IF NOT EXISTS answers jsonb');
}
if (!checks.program_insights) {
  statements.push(`CREATE TABLE IF NOT EXISTS program_insights (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
)`);
}
if (!checks.media_files) {
  statements.push(`CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mime_type text NOT NULL,
  data bytea NOT NULL,
  size_bytes integer NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
)`);
  statements.push(
    'ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS image_media_id uuid REFERENCES media_files(id) ON DELETE SET NULL',
  );
  statements.push('ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS link_hash text');
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

// Normalize legacy localhost photo URLs in task submissions
const photoFix = await client.query(`
  UPDATE task_submissions
  SET photos = (
    SELECT array_agg(
      CASE
        WHEN elem ~ '^https?://[^/]+/api/media/' THEN regexp_replace(elem, '^https?://[^/]+', '')
        ELSE elem
      END
    )
    FROM unnest(photos) AS elem
  )
  WHERE photos IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM unnest(photos) AS p WHERE p ~ '^https?://[^/]+/api/media/'
    )
`);
if ((photoFix.rowCount ?? 0) > 0) {
  console.log(`Normalized localhost photo URLs in ${photoFix.rowCount} task submission(s).`);
}

await client.end();
