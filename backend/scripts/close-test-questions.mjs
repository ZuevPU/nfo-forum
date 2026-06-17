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

await client.connect();

const { rows: candidates } = await client.query(
  `SELECT id, text, end_time FROM reflection_questions
   WHERE text ILIKE '%тест%' OR text ILIKE '%test%'
   ORDER BY id`,
);

if (candidates.length === 0) {
  console.log('No test reflection questions found.');
} else {
  console.log(`Found ${candidates.length} test question(s):`);
  for (const q of candidates) {
    console.log(`  #${q.id}: ${q.text.slice(0, 80)}${q.text.length > 80 ? '…' : ''}`);
  }

  const past = new Date('2020-01-01T00:00:00Z');
  const result = await client.query(
    `UPDATE reflection_questions
     SET end_time = $1
     WHERE (text ILIKE '%тест%' OR text ILIKE '%test%')
       AND (end_time IS NULL OR end_time > NOW())`,
    [past],
  );
  console.log(`\nClosed ${result.rowCount ?? 0} question(s) (end_time set to past).`);
}

await client.end();
