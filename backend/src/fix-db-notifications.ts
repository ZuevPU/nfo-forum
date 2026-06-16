import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL!;

async function main() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true NOT NULL;');
    console.log('Added notifications_enabled');
  } catch (e) {
    console.error(e.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);