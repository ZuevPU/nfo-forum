import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stateCheckins } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardPointsForSource } from './pointsConfig.service.js';
import { getCheckinSettings } from './admin.service.js';
import {
  getCheckinSlotLabel,
  getCurrentCheckinSlotIndex,
  getNextCheckinSlot,
  mapCheckinToSlotIndex,
} from '../utils/slotMatching.js';
import { moscowDateString } from '../utils/moscowTime.js';

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

function isTrackEnabled(settings: { enabledTracks: string[] }, user: UserDto): boolean {
  if (settings.enabledTracks.length === 0) return true;
  if (!user.track) return false;
  return settings.enabledTracks.includes(user.track);
}

function getTodayStartMsk(): Date {
  const today = moscowDateString();
  return new Date(`${today}T00:00:00+03:00`);
}

export async function getCheckinStatus(user: UserDto) {
  const settings = await getCheckinSettings();
  const available = isTrackEnabled(settings, user);
  const slots = settings.slots.length ? settings.slots : ['08:30', '13:15', '19:30'];
  const now = new Date();
  const slotIndex = getCurrentCheckinSlotIndex(slots, now);
  const activeSlot = slotIndex != null ? slots[slotIndex] : null;
  const slotLabel = slotIndex != null ? getCheckinSlotLabel(slotIndex) : null;

  const todayCheckins = await getTodayCheckins(user.id);
  const answeredSlotIndices = new Set(
    todayCheckins
      .map((c) => mapCheckinToSlotIndex(c.createdAt, slots))
      .filter((i): i is number => i != null),
  );

  const answeredInCurrentSlot = slotIndex != null && answeredSlotIndices.has(slotIndex);
  const canSubmit = available && slotIndex != null && !answeredInCurrentSlot;

  const next = getNextCheckinSlot(slots, now);

  return {
    available,
    canSubmit,
    activeSlot,
    slotLabel,
    nextSlotAt: next?.slot ?? null,
    nextSlotLabel: next?.label ?? null,
    answeredInCurrentSlot,
  };
}

export async function createCheckin(
  user: UserDto,
  emotion: string,
  energyLevel: number,
  comment?: string,
) {
  const settings = await getCheckinSettings();
  if (!isTrackEnabled(settings, user)) {
    throw new Error('Чек-ин недоступен для вашего трека');
  }

  const slots = settings.slots.length ? settings.slots : ['08:30', '13:15', '19:30'];
  const now = new Date();
  const slotIndex = getCurrentCheckinSlotIndex(slots, now);
  if (slotIndex == null) {
    throw new Error('Чек-ин сейчас закрыт');
  }

  const todayCheckins = await getTodayCheckins(user.id);
  const alreadyInSlot = todayCheckins.some(
    (c) => mapCheckinToSlotIndex(c.createdAt, slots) === slotIndex,
  );
  if (alreadyInSlot) {
    throw new Error('Вы уже отметились в этом слоте');
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
  const todayStart = getTodayStartMsk();

  return db
    .select()
    .from(stateCheckins)
    .where(and(eq(stateCheckins.userId, userId), gte(stateCheckins.createdAt, todayStart)))
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
