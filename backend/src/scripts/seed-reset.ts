import { sql } from 'drizzle-orm';
import { closeDatabase, db } from '../db/index.js';
import {
  events,
  reflectionQuestions,
  systemSettings,
  tasks,
} from '../db/schema.js';

async function dedupeEvents() {
  await db.execute(sql`
    DELETE FROM events a
    USING events b
    WHERE a.id > b.id
      AND a.title = b.title
      AND COALESCE(a.track, '') = COALESCE(b.track, '')
      AND a.start_time = b.start_time
  `);
  console.log('Duplicate events removed.');
}

async function resetSeedTables() {
  await db.delete(events);
  await db.delete(tasks);
  await db.delete(reflectionQuestions);
  await db.delete(systemSettings);
  console.log('Seed tables cleared.');
}

async function main() {
  const mode = process.argv[2] ?? 'dedupe';

  if (mode === 'reset') {
    await resetSeedTables();
    console.log('Run "npm run seed -w backend" to re-seed.');
  } else {
    await dedupeEvents();
  }

  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
