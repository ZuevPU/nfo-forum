import dotenv from 'dotenv';
import { users } from '../db/schema.js';
import { db, pool } from '../db/index.js';

dotenv.config();

async function main() {
  const rows = await db
    .select({
      id: users.id,
      vkId: users.vkId,
      role: users.role,
      messagesFromGroupAllowed: users.messagesFromGroupAllowed,
      notificationsEnabled: users.notificationsEnabled,
      track: users.track,
    })
    .from(users)
    .orderBy(users.id);

  const total = rows.length;
  const withMessages = rows.filter((r) => r.messagesFromGroupAllowed).length;
  const fullyEligible = rows.filter(
    (r) => r.messagesFromGroupAllowed && r.notificationsEnabled,
  ).length;
  const admins = rows.filter((r) => r.role === 'admin');
  const adminsWithMessages = admins.filter((r) => r.messagesFromGroupAllowed).length;

  console.log('\n=== Push subscription diagnostics ===\n');
  console.log(`Total users:              ${total}`);
  console.log(`With community messages:  ${withMessages} (${pct(withMessages, total)})`);
  console.log(`Fully eligible (msgs+on): ${fullyEligible} (${pct(fullyEligible, total)})`);
  console.log(`Without community msgs:   ${total - withMessages} (${pct(total - withMessages, total)})`);
  console.log('');
  console.log(`Admins total:             ${admins.length}`);
  console.log(`Admins with messages:     ${adminsWithMessages}`);
  console.log('');
  console.log('Per-user breakdown:');
  console.log('id | role        | messages | notif | track');
  console.log('---+-------------+----------+-------+------');
  for (const r of rows) {
    console.log(
      `${String(r.id).padEnd(3)}| ${r.role.padEnd(12)}| ${r.messagesFromGroupAllowed ? 'yes' : 'no  '}     | ${r.notificationsEnabled ? 'on ' : 'off'}  | ${r.track ?? '—'}`,
    );
  }

  if (withMessages <= adminsWithMessages && total > admins.length) {
    console.log('\n⚠ Only admins (or very few users) have messages_from_group_allowed=true.');
    console.log('  Regular users must enable "Сообщения от сообщества" in Settings and accept the VK dialog.');
  }
}

function pct(n: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
