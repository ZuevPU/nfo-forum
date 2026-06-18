import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stateCheckins } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardAction } from './pointsEngine.service.js';
import { getCheckinSettings, resolveCheckinSettingsForDay } from './admin.service.js';
import {
  getCheckinSlotLabel,
  getCurrentCheckinSlotIndex,
  getCurrentIntervalIndex,
  getNextCheckinSlot,
  getNextInterval,
  mapCheckinToIntervalIndex,
  mapCheckinToSlotIndex,
  slotWindowEndTime,
  type CheckinInterval,
} from '../utils/slotMatching.js';
import { moscowDateString, programDayFromMsk } from '../utils/moscowTime.js';

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

function resolveCheckinTiming(settings: Awaited<ReturnType<typeof getCheckinSettings>>, now = new Date()) {
  const windowMinutes = settings.windowMinutes ?? 120;
  const intervals = settings.intervals as CheckinInterval[] | undefined;
  if (intervals?.length) {
    const slotIndex = getCurrentIntervalIndex(intervals, now);
    const activeSlot = slotIndex != null ? intervals[slotIndex].start : null;
    const slotLabel = slotIndex != null
      ? intervals[slotIndex].label ?? getCheckinSlotLabel(slotIndex)
      : null;
    const next = getNextInterval(intervals, now);
    return {
      useIntervals: true as const,
      intervals,
      slotIndex,
      activeSlot,
      slotLabel,
      nextSlotAt: next?.start ?? null,
      nextSlotLabel: next?.label ?? null,
      windowMinutes,
    };
  }

  const slots = settings.slots.length ? settings.slots : ['08:30', '13:15', '19:30'];
  const slotIndex = getCurrentCheckinSlotIndex(slots, now, windowMinutes);
  const activeSlot = slotIndex != null ? slots[slotIndex] : null;
  const slotLabel = slotIndex != null ? getCheckinSlotLabel(slotIndex) : null;
  const next = getNextCheckinSlot(slots, now);
  return {
    useIntervals: false as const,
    slots,
    slotIndex,
    activeSlot,
    slotLabel,
    nextSlotAt: next?.slot ?? null,
    nextSlotLabel: next?.label ?? null,
    windowMinutes,
  };
}

function mapCheckinTimeToSlotIndex(createdAt: Date, timing: ReturnType<typeof resolveCheckinTiming>) {
  if (timing.useIntervals) {
    return mapCheckinToIntervalIndex(createdAt, timing.intervals);
  }
  return mapCheckinToSlotIndex(createdAt, timing.slots, timing.windowMinutes ?? 120);
}

export async function getCheckinStatus(user: UserDto) {
  const baseSettings = await getCheckinSettings();
  const settings = resolveCheckinSettingsForDay(baseSettings, programDayFromMsk());
  const available = isTrackEnabled(settings, user);
  const now = new Date();
  const timing = resolveCheckinTiming(settings, now);

  const todayCheckins = await getTodayCheckins(user.id);
  const answeredSlotIndices = new Set(
    todayCheckins
      .map((c) => mapCheckinTimeToSlotIndex(c.createdAt, timing))
      .filter((i): i is number => i != null),
  );

  const answeredInCurrentSlot = timing.slotIndex != null && answeredSlotIndices.has(timing.slotIndex);
  const canSubmit = available && timing.slotIndex != null && !answeredInCurrentSlot;
  const windowEndsAt =
    timing.activeSlot && !timing.useIntervals
      ? slotWindowEndTime(timing.activeSlot, timing.windowMinutes ?? 120)
      : null;

  return {
    available,
    canSubmit,
    activeSlot: timing.activeSlot,
    slotLabel: timing.slotLabel,
    nextSlotAt: timing.nextSlotAt,
    nextSlotLabel: timing.nextSlotLabel,
    answeredInCurrentSlot,
    windowEndsAt,
    title: settings.title,
    subtitle: settings.subtitle,
    emotions: settings.emotions,
    energyLabel: settings.energyLabel,
    energyLowLabel: settings.energyLowLabel,
    energyMidLabel: settings.energyMidLabel,
    energyHighLabel: settings.energyHighLabel,
    emotionLabel: settings.emotionLabel,
    commentPlaceholder: settings.commentPlaceholder,
  };
}

export async function createCheckin(
  user: UserDto,
  emotion: string,
  energyLevel: number,
  comment?: string,
) {
  const baseSettings = await getCheckinSettings();
  const settings = resolveCheckinSettingsForDay(baseSettings, programDayFromMsk());
  if (!isTrackEnabled(settings, user)) {
    throw new Error('Чек-ин недоступен для вашего трека');
  }

  const allowedEmotions = new Set(settings.emotions.map((e) => e.toLowerCase()));
  if (!allowedEmotions.has(emotion.toLowerCase())) {
    throw new Error('Недопустимое настроение');
  }

  const now = new Date();
  const timing = resolveCheckinTiming(settings, now);
  if (timing.slotIndex == null) {
    throw new Error('Чек-ин сейчас закрыт');
  }

  const todayCheckins = await getTodayCheckins(user.id);
  const alreadyInSlot = todayCheckins.some(
    (c) => mapCheckinTimeToSlotIndex(c.createdAt, timing) === timing.slotIndex,
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

  await awardAction(user.id, 'checkin_emotion', created.id, { skipIfSourceIdExists: true });
  await awardAction(user.id, 'checkin_energy', created.id, { skipIfSourceIdExists: true });
  if (comment?.trim()) {
    await awardAction(user.id, 'checkin_comment', created.id, { skipIfSourceIdExists: true });
  }

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
