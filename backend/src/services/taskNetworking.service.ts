import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taskNetworkingQueue, users } from '../db/schema.js';
import { sendPush } from './push.service.js';

export async function joinNetworkingQueue(taskId: number, userId: number): Promise<{
  status: 'waiting' | 'paired';
  partner?: { id: number; firstName: string; lastName: string | null; track: string | null };
}> {
  const [existing] = await db
    .select()
    .from(taskNetworkingQueue)
    .where(and(eq(taskNetworkingQueue.taskId, taskId), eq(taskNetworkingQueue.userId, userId)))
    .limit(1);

  if (existing?.status === 'paired' && existing.partnerUserId) {
    const [partner] = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, track: users.track })
      .from(users)
      .where(eq(users.id, existing.partnerUserId))
      .limit(1);
    return { status: 'paired', partner: partner ?? undefined };
  }

  if (existing?.status === 'waiting') {
    return { status: 'waiting' };
  }

  const [waitingPartner] = await db
    .select()
    .from(taskNetworkingQueue)
    .where(
      and(
        eq(taskNetworkingQueue.taskId, taskId),
        eq(taskNetworkingQueue.status, 'waiting'),
        ne(taskNetworkingQueue.userId, userId),
      ),
    )
    .limit(1);

  if (waitingPartner) {
    await db
      .update(taskNetworkingQueue)
      .set({ status: 'paired', partnerUserId: userId })
      .where(eq(taskNetworkingQueue.id, waitingPartner.id));

    await db.insert(taskNetworkingQueue).values({
      taskId,
      userId,
      partnerUserId: waitingPartner.userId,
      status: 'paired',
    });

    const [partner] = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, track: users.track })
      .from(users)
      .where(eq(users.id, waitingPartner.userId))
      .limit(1);

    void sendPush({
      text: 'Тебе назначен партнёр для нетворкинг-задания! Открой раздел «Задания».',
      hash: '#/tasks',
      targetType: 'user',
      targetUserId: userId,
    }).catch(console.error);

    void sendPush({
      text: 'Тебе назначен партнёр для нетворкинг-задания! Открой раздел «Задания».',
      hash: '#/tasks',
      targetType: 'user',
      targetUserId: waitingPartner.userId,
    }).catch(console.error);

    return { status: 'paired', partner: partner ?? undefined };
  }

  await db.insert(taskNetworkingQueue).values({
    taskId,
    userId,
    status: 'waiting',
  });

  return { status: 'waiting' };
}

export async function getNetworkingPartner(taskId: number, userId: number) {
  const [row] = await db
    .select()
    .from(taskNetworkingQueue)
    .where(and(eq(taskNetworkingQueue.taskId, taskId), eq(taskNetworkingQueue.userId, userId)))
    .limit(1);

  if (!row) return null;

  if (row.status === 'waiting') {
    return { status: 'waiting' as const, partner: null };
  }

  if (!row.partnerUserId) return null;

  const [partner] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, track: users.track })
    .from(users)
    .where(eq(users.id, row.partnerUserId))
    .limit(1);

  return { status: 'paired' as const, partner: partner ?? null };
}
