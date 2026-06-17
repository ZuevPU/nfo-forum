import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userNotifications } from '../db/schema.js';
import type { NotificationCategory } from '../constants/notifications.js';

export interface RecordNotificationInput {
  text: string;
  category?: NotificationCategory;
  linkHash?: string;
  linkLabel?: string;
}

// Убираем VK-разметку ссылки вида "\n[https://vk.com/...|label]" из текста для ленты.
function stripAppLink(text: string): string {
  return text.replace(/\n?\[https?:\/\/[^\]]*\|[^\]]*\]/g, '').trim();
}

export async function recordUserNotifications(
  userIds: number[],
  input: RecordNotificationInput,
): Promise<void> {
  if (!userIds.length) return;
  const cleanText = stripAppLink(input.text);
  const linkHash = input.linkHash ? input.linkHash.replace(/^#\/?/, '') : null;
  const rows = userIds.map((userId) => ({
    userId,
    text: cleanText,
    category: input.category ?? null,
    linkHash,
    linkLabel: input.linkLabel ?? null,
  }));
  await db.insert(userNotifications).values(rows);
}

export async function listNotifications(userId: number, limit = 50) {
  return db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
  return row?.count ?? 0;
}

export async function markRead(userId: number, id: number): Promise<void> {
  await db
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)));
}

export async function markAllRead(userId: number): Promise<void> {
  await db
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
}
