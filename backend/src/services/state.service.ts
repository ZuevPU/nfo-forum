import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stateCheckins } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardPointsForSource } from './pointsConfig.service.js';
import { getCheckinSettings } from './admin.service.js';

const BOT_REACTIONS: Record<string, string> = {
  тревога: 'Тревога нормальна — попробуй сфокусироваться на одном блоке за раз.',
  растерянность: 'Растерянность бывает — выбери один ближайший блок и начни с него.',
  скука: 'Если скучно — попробуй задать вопрос в «Обмене опытом» или ответить коллегам.',
  раздражение: 'Раздражение — сигнал усталости. Короткая пауза может помочь.',
  усталость: 'Если устал — сделай паузу между блоками, это поможет.',
  спокойствие: 'Спокойствие — хорошая база для осмысленного дня на форуме.',
  интерес: 'Интерес — отличный двигатель для участия в программе!',
  вовлечённость: 'Вовлечённость помогает извлекать максимум из каждого блока.',
  воодушевление: 'Воодушевление — суперсила! Поделись энергией с коллегами.',
  радость: 'Отличное настроение — хороший знак для продуктивного дня!',
  гордость: 'Гордость за прогресс — признак настоящего роста. Так держать!',
};

export async function createCheckin(
  user: UserDto,
  emotion: string,
  energyLevel: number,
  comment?: string,
) {
  const settings = await getCheckinSettings();
  if (
    settings.enabledTracks.length > 0 &&
    user.track &&
    !settings.enabledTracks.includes(user.track)
  ) {
    throw new Error('Check-in is not enabled for your track');
  }

  const [created] = await db
    .insert(stateCheckins)
    .values({
      userId: user.id,
      emotion,
      energyLevel,
      comment: comment ?? null,
    })
    .returning();

  const botReaction = BOT_REACTIONS[emotion.toLowerCase()] ?? 'Спасибо за чек-ин! Я рядом весь день.';

  await awardPointsForSource(user.id, 'checkin', created.id);

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
