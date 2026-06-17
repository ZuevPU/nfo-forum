import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taskNetworkingQueue, tasks, users } from '../db/schema.js';
import { sendPush } from './push.service.js';
import { entityLink } from '../utils/appLinks.js';

type Partner = { id: number; firstName: string; lastName: string | null; track: string | null };

export type NetworkingState = {
  mode: 'pair' | 'multi';
  contactsRequired: number;
  status: 'waiting' | 'paired';
  partner: Partner | null;
  partners: Partner[];
};

async function fetchPartners(ids: number[]): Promise<Partner[]> {
  const uniqueIds = [...new Set(ids)];
  const result: Partner[] = [];
  for (const id of uniqueIds) {
    const [row] = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, track: users.track })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (row) result.push(row);
  }
  return result;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function assignMultiContacts(taskId: number, userId: number, count: number): Promise<NetworkingState> {
  const existingRows = await db
    .select()
    .from(taskNetworkingQueue)
    .where(and(eq(taskNetworkingQueue.taskId, taskId), eq(taskNetworkingQueue.userId, userId)));

  const partnerIds = existingRows
    .map((r) => r.partnerUserId)
    .filter((id): id is number => id != null);

  if (partnerIds.length >= count) {
    const partners = await fetchPartners(partnerIds.slice(0, count));
    return {
      mode: 'multi',
      contactsRequired: count,
      status: 'paired',
      partner: partners[0] ?? null,
      partners,
    };
  }

  const needed = count - partnerIds.length;
  const excludeIds = new Set([...partnerIds, userId]);
  const allCandidates = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'participant'));

  const candidates = allCandidates.filter((c) => !excludeIds.has(c.id));
  const picked = shuffle(candidates).slice(0, needed);

  for (const candidate of picked) {
    await db.insert(taskNetworkingQueue).values({
      taskId,
      userId,
      partnerUserId: candidate.id,
      status: 'paired',
    });
    partnerIds.push(candidate.id);
  }

  const partners = await fetchPartners(partnerIds.slice(0, count));
  const status = partners.length >= count ? 'paired' : 'waiting';

  if (status === 'paired') {
    void sendPush({
      text: `Тебе назначены ${count} участника для нетворкинг-задания! Открой раздел «Задания».`,
      hash: entityLink('tasks', taskId),
      linkHash: entityLink('tasks', taskId),
      targetType: 'user',
      targetUserId: userId,
    }).catch(console.error);
  }

  return {
    mode: 'multi',
    contactsRequired: count,
    status,
    partner: partners[0] ?? null,
    partners,
  };
}

export async function joinNetworkingQueue(
  taskId: number,
  userId: number,
  contactsRequired = 1,
): Promise<NetworkingState> {
  if (contactsRequired > 1) {
    return assignMultiContacts(taskId, userId, contactsRequired);
  }

  const [existing] = await db
    .select()
    .from(taskNetworkingQueue)
    .where(and(eq(taskNetworkingQueue.taskId, taskId), eq(taskNetworkingQueue.userId, userId)))
    .limit(1);

  if (existing?.status === 'paired' && existing.partnerUserId) {
    const partners = await fetchPartners([existing.partnerUserId]);
    return {
      mode: 'pair',
      contactsRequired: 1,
      status: 'paired',
      partner: partners[0] ?? null,
      partners,
    };
  }

  if (existing?.status === 'waiting') {
    return { mode: 'pair', contactsRequired: 1, status: 'waiting', partner: null, partners: [] };
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

    const partners = await fetchPartners([waitingPartner.userId]);

    void sendPush({
      text: 'Тебе назначен партнёр для нетворкинг-задания! Открой раздел «Задания».',
      hash: entityLink('tasks', taskId),
      linkHash: entityLink('tasks', taskId),
      targetType: 'user',
      targetUserId: userId,
    }).catch(console.error);

    void sendPush({
      text: 'Тебе назначен партнёр для нетворкинг-задания! Открой раздел «Задания».',
      hash: entityLink('tasks', taskId),
      linkHash: entityLink('tasks', taskId),
      targetType: 'user',
      targetUserId: waitingPartner.userId,
    }).catch(console.error);

    return {
      mode: 'pair',
      contactsRequired: 1,
      status: 'paired',
      partner: partners[0] ?? null,
      partners,
    };
  }

  await db.insert(taskNetworkingQueue).values({
    taskId,
    userId,
    status: 'waiting',
  });

  return { mode: 'pair', contactsRequired: 1, status: 'waiting', partner: null, partners: [] };
}

export async function getNetworkingState(
  taskId: number,
  userId: number,
  contactsRequired = 1,
): Promise<NetworkingState | null> {
  const rows = await db
    .select()
    .from(taskNetworkingQueue)
    .where(and(eq(taskNetworkingQueue.taskId, taskId), eq(taskNetworkingQueue.userId, userId)));

  if (rows.length === 0) return null;

  if (contactsRequired > 1) {
    const partnerIds = rows
      .map((r) => r.partnerUserId)
      .filter((id): id is number => id != null);
    const partners = await fetchPartners(partnerIds);
    const status = partners.length >= contactsRequired ? 'paired' : 'waiting';
    return {
      mode: 'multi',
      contactsRequired,
      status,
      partner: partners[0] ?? null,
      partners,
    };
  }

  const [row] = rows;
  if (row.status === 'waiting') {
    return { mode: 'pair', contactsRequired: 1, status: 'waiting', partner: null, partners: [] };
  }

  if (!row.partnerUserId) return null;

  const partners = await fetchPartners([row.partnerUserId]);
  return {
    mode: 'pair',
    contactsRequired: 1,
    status: 'paired',
    partner: partners[0] ?? null,
    partners,
  };
}

/** @deprecated use getNetworkingState */
export async function getNetworkingPartner(taskId: number, userId: number) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const contactsRequired = task?.networkingContacts ?? 1;
  const state = await getNetworkingState(taskId, userId, contactsRequired);
  if (!state) return null;
  return {
    status: state.status,
    partner: state.partner,
    partners: state.partners,
    mode: state.mode,
    contactsRequired: state.contactsRequired,
  };
}
