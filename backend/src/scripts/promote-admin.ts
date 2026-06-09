import { eq } from 'drizzle-orm';
import { closeDatabase, db } from '../db/index.js';
import { users } from '../db/schema.js';

async function promoteAdmin() {
  const vkId = process.argv[2];

  if (!vkId) {
    console.error('Usage: npm run promote-admin -w backend -- <vk_id>');
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.vkId, vkId)).limit(1);

  if (!user) {
    console.error(`User not found: ${vkId}`);
    process.exit(1);
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.vkId, vkId));

  console.log(`Promoted to admin: ${user.firstName} ${user.lastName ?? ''} (${vkId})`);
  await closeDatabase();
}

promoteAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
