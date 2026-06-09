import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stateCheckins } from '../db/schema.js';
import type { UserDto } from '../types/api.js';

const BOT_REACTIONS: Record<string, string> = {
  радость: 'Отличное настроение — хороший знак для продуктивного дня!',
  открытость: 'Открытость к новому — ключевой навык на форуме.',
  любопытство: 'Любопытство поможет извлечь максимум из программы.',
  тревога: 'Тревога нормальна — попробуй сфокусироваться на одном блоке за раз.',
  усталость: 'Если устал — сделай паузу между блоками, это поможет.',
};

export async function createCheckin(
  user: UserDto,
  emotion: string,
  energyLevel: number,
  comment?: string,
) {
  const [created] = await db
    .insert(stateCheckins)
    .values({
      userId: user.id,
      emotion,
      energyLevel,
      comment: comment ?? null,
    })
    .returning();

  const botReaction = BOT_REACTIONS[emotion] ?? 'Спасибо за чек-ин! Я рядом весь день.';

  return { checkin: created, botReaction };
}

export async function getTodayCheckins(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db
    .select()
    .from(stateCheckins)
    .where(and(eq(stateCheckins.userId, userId), gte(stateCheckins.createdAt, today)))
    .orderBy(desc(stateCheckins.createdAt));
}

export async function getCheckinHistory(userId: number, limit = 10) {
  return db
    .select()
    .from(stateCheckins)
    .where(eq(stateCheckins.userId, userId))
    .orderBy(desc(stateCheckins.createdAt))
    .limit(limit);
}
