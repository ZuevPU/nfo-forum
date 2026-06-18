import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { feedbackMessages, feedbackReplies, users } from '../db/schema.js';
import { notifyUser } from './push.service.js';

export interface FeedbackReplyDto {
  id: number;
  text: string;
  createdAt: string;
  adminUserId: number;
  adminFirstName: string;
  adminLastName: string | null;
}

export interface FeedbackThreadItemDto {
  id: number;
  text: string;
  createdAt: string;
  userId: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  replies: FeedbackReplyDto[];
}

async function loadRepliesByMessageIds(messageIds: number[]): Promise<Map<number, FeedbackReplyDto[]>> {
  if (messageIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: feedbackReplies.id,
      messageId: feedbackReplies.messageId,
      text: feedbackReplies.text,
      createdAt: feedbackReplies.createdAt,
      adminUserId: feedbackReplies.adminUserId,
      adminFirstName: users.firstName,
      adminLastName: users.lastName,
    })
    .from(feedbackReplies)
    .innerJoin(users, eq(feedbackReplies.adminUserId, users.id))
    .where(inArray(feedbackReplies.messageId, messageIds))
    .orderBy(asc(feedbackReplies.createdAt));

  const map = new Map<number, FeedbackReplyDto[]>();
  for (const row of rows) {
    const reply: FeedbackReplyDto = {
      id: row.id,
      text: row.text,
      createdAt: row.createdAt.toISOString(),
      adminUserId: row.adminUserId,
      adminFirstName: row.adminFirstName,
      adminLastName: row.adminLastName,
    };
    const list = map.get(row.messageId) ?? [];
    list.push(reply);
    map.set(row.messageId, list);
  }
  return map;
}

export async function submitFeedback(userId: number, text: string) {
  await db.insert(feedbackMessages).values({ userId, text });
}

export async function listUserFeedbackThread(userId: number): Promise<FeedbackThreadItemDto[]> {
  const messages = await db
    .select({
      id: feedbackMessages.id,
      text: feedbackMessages.text,
      createdAt: feedbackMessages.createdAt,
      userId: feedbackMessages.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      track: users.track,
    })
    .from(feedbackMessages)
    .innerJoin(users, eq(feedbackMessages.userId, users.id))
    .where(eq(feedbackMessages.userId, userId))
    .orderBy(desc(feedbackMessages.createdAt));

  const repliesMap = await loadRepliesByMessageIds(messages.map((m) => m.id));

  return messages.map((m) => ({
    id: m.id,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    userId: m.userId,
    firstName: m.firstName,
    lastName: m.lastName,
    track: m.track,
    replies: repliesMap.get(m.id) ?? [],
  }));
}

export async function listAdminFeedbackMessages(): Promise<FeedbackThreadItemDto[]> {
  const messages = await db
    .select({
      id: feedbackMessages.id,
      text: feedbackMessages.text,
      createdAt: feedbackMessages.createdAt,
      userId: feedbackMessages.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      track: users.track,
    })
    .from(feedbackMessages)
    .innerJoin(users, eq(feedbackMessages.userId, users.id))
    .orderBy(desc(feedbackMessages.createdAt));

  const repliesMap = await loadRepliesByMessageIds(messages.map((m) => m.id));

  return messages.map((m) => ({
    id: m.id,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    userId: m.userId,
    firstName: m.firstName,
    lastName: m.lastName,
    track: m.track,
    replies: repliesMap.get(m.id) ?? [],
  }));
}

export async function replyToFeedback(messageId: number, adminUserId: number, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Reply text is required');

  const [message] = await db
    .select({
      id: feedbackMessages.id,
      userId: feedbackMessages.userId,
      text: feedbackMessages.text,
    })
    .from(feedbackMessages)
    .where(eq(feedbackMessages.id, messageId))
    .limit(1);

  if (!message) throw new Error('Message not found');

  const [admin] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, adminUserId))
    .limit(1);

  const adminName = admin ? `${admin.firstName} ${admin.lastName ?? ''}`.trim() : 'Организатор';

  const [reply] = await db
    .insert(feedbackReplies)
    .values({ messageId, adminUserId, text: trimmed })
    .returning();

  const notificationText = `Организаторы ответили на ваше обращение.\n\n${trimmed}`;

  void notifyUser(
    message.userId,
    notificationText,
    'program',
    'home/feedback',
    'Смотреть ответ',
  );

  return {
    reply: {
      id: reply.id,
      text: reply.text,
      createdAt: reply.createdAt.toISOString(),
      adminUserId,
      adminFirstName: admin?.firstName ?? 'Организатор',
      adminLastName: admin?.lastName ?? null,
    } satisfies FeedbackReplyDto,
    adminName,
  };
}
