import { and, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { broadcasts, events, reflectionQuestions, systemSettings } from '../db/schema.js';
import type { NotificationCategory } from '../constants/notifications.js';
import { sendPush, deliverPush, notifyUsersForTrack } from './push.service.js';
import { getEnabledTracks } from './diagnostics.service.js';
import { getCheckinSettings, getExchangeSlotSettings } from './admin.service.js';
import { getNfoDayConfig } from './reflection.service.js';
import { isInSlotWindow, slotDedupKey } from '../utils/slotMatching.js';

const CRON_JOBS: Record<
  string,
  {
    text?: string;
    hour?: number;
    minute?: number;
    hash?: string;
    isDiagnostics?: boolean;
    custom?: boolean;
    category?: NotificationCategory;
  }
> = {
  'morning-greeting': {
    text: 'Доброе утро! Сегодня отличный день на Форуме НФО. Открой расписание своего трека.',
    hour: 8,
    minute: 0,
    hash: '#/schedule',
    category: 'program',
  },
  'morning-checkin': {
    text: 'Утренний чек-ин: как ты себя чувствуешь? Займи 30 секунд.',
    hour: 8,
    minute: 30,
    hash: '#/checkin',
    category: 'program',
  },
  'daily-tasks': {
    text: 'Задания дня обновлены! Посмотри, что ждёт тебя сегодня.',
    hour: 9,
    minute: 0,
    hash: '#/tasks',
    category: 'tasks',
  },
  'lunch-exchange': {
    text: 'Обед — время обмена опытом! Задай вопрос или ответь коллегам.',
    hour: 13,
    minute: 15,
    hash: '#/exchange',
    category: 'exchange',
  },
  'evening-reflection': {
    text: 'Вечерняя рефлексия открыта. Поделись мыслями о прошедшем дне.',
    hour: 19,
    minute: 30,
    hash: '#/nfo-day',
    category: 'questions',
  },
  goodnight: {
    text: 'Спокойной ночи! Завтра — новый день на Форуме НФО.',
    hour: 20,
    minute: 0,
    category: 'program',
  },
  'trainer-diagnostics': {
    text: 'Время оценить свои компетенции! Пройди самодиагностику тренера.',
    hour: 14,
    minute: 0,
    hash: '#/diagnostics',
    isDiagnostics: true,
    category: 'tasks',
  },
  'event-reminders': { custom: true },
  'scheduled-broadcasts': { custom: true },
  'reflection-publish': { custom: true },
  'dynamic-slots': { custom: true },
};

async function runEventReminders(): Promise<number> {
  const now = new Date();
  const inTenMinutes = new Date(now.getTime() + 10 * 60 * 1000);
  const inElevenMinutes = new Date(now.getTime() + 11 * 60 * 1000);

  const upcoming = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.isKeyBlock, true),
        gte(events.startTime, inTenMinutes),
        lte(events.startTime, inElevenMinutes),
        isNull(events.reminderSentAt),
      ),
    );

  let sent = 0;
  for (const event of upcoming) {
    const place = event.place ? ` · ${event.place}` : '';
    const text = `Через 10 минут: «${event.title}»${place}\n#/schedule`;

    const result = event.track
      ? await sendPush({
          text,
          targetType: 'track',
          targetTracks: [event.track],
          category: 'program',
          skipBroadcastLog: true,
        })
      : await sendPush({
          text,
          targetType: 'all',
          category: 'program',
          skipBroadcastLog: true,
        });

    await db.update(events).set({ reminderSentAt: new Date() }).where(eq(events.id, event.id));
    sent += result.sent;
  }
  return sent;
}

async function runScheduledBroadcasts(): Promise<number> {
  const now = new Date();
  const pending = await db
    .select()
    .from(broadcasts)
    .where(and(isNull(broadcasts.sentAt), lte(broadcasts.scheduledAt, now)));

  let sent = 0;
  for (const b of pending) {
    if (!b.scheduledAt) continue;

    const sentCount = await deliverPush({
      text: b.text,
      image: b.image ?? undefined,
      targetType: b.targetType as 'all' | 'track' | 'user',
      targetTracks: b.targetTracks ?? undefined,
      targetUserId: b.targetUserId ?? undefined,
    });

    await db.update(broadcasts).set({ sentAt: new Date() }).where(eq(broadcasts.id, b.id));
    sent += sentCount;
  }
  return sent;
}

async function runReflectionPublish(): Promise<number> {
  const now = new Date();
  const due = await db
    .select()
    .from(reflectionQuestions)
    .where(
      and(
        lte(reflectionQuestions.publishTime, now),
        isNull(reflectionQuestions.notificationSentAt),
        eq(reflectionQuestions.sendNotification, true),
      ),
    );

  let sent = 0;
  for (const q of due) {
    const text = `Новый вопрос для рефлексии: ${q.text.slice(0, 80)}${q.text.length > 80 ? '…' : ''}`;
    const result = await notifyUsersForTrack(q.track, text, 'questions', '#/questions');
    await db
      .update(reflectionQuestions)
      .set({ notificationSentAt: now })
      .where(eq(reflectionQuestions.id, q.id));
    sent += result.sent;
  }
  return sent;
}

const CRON_DEDUP_KEY = 'cron_slot_dedup';

async function getCronDedup(): Promise<Record<string, string>> {
  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, CRON_DEDUP_KEY))
    .limit(1);
  return (row?.value as Record<string, string>) ?? {};
}

async function markCronSlotSent(key: string): Promise<void> {
  const dedup = await getCronDedup();
  dedup[key] = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, CRON_DEDUP_KEY))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: dedup, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: CRON_DEDUP_KEY, value: dedup });
  }
}

async function sendIfSlotNotSent(
  type: string,
  slot: string,
  payload: { text: string; hash?: string; category: NotificationCategory },
): Promise<number> {
  const key = slotDedupKey(type, slot);
  const dedup = await getCronDedup();
  if (dedup[key]) return 0;

  const text = payload.hash ? `${payload.text}\n${payload.hash}` : payload.text;
  const result = await sendPush({
    text,
    targetType: 'all',
    category: payload.category,
    skipBroadcastLog: true,
  });
  await markCronSlotSent(key);
  return result.sent;
}

async function sendIfSlotNotSentForTracks(
  type: string,
  slot: string,
  tracks: string[],
  payload: { text: string; hash?: string; category: NotificationCategory },
): Promise<number> {
  const key = slotDedupKey(type, slot);
  const dedup = await getCronDedup();
  if (dedup[key]) return 0;

  const text = payload.hash ? `${payload.text}\n${payload.hash}` : payload.text;
  const result = await sendPush({
    text,
    targetType: 'track',
    targetTracks: tracks,
    category: payload.category,
    skipBroadcastLog: true,
  });
  await markCronSlotSent(key);
  return result.sent;
}

async function runDynamicSlots(): Promise<number> {
  const now = new Date();
  let sent = 0;

  const checkin = await getCheckinSettings();
  for (const slot of checkin.slots) {
    if (!isInSlotWindow(slot, now)) continue;
    const payload = {
      text: 'Чек-ин: как ты себя чувствуешь? Займи 30 секунд.',
      hash: '#/checkin',
      category: 'program' as NotificationCategory,
    };
    if (checkin.enabledTracks.length > 0) {
      sent += await sendIfSlotNotSentForTracks('checkin', slot, checkin.enabledTracks, payload);
    } else {
      sent += await sendIfSlotNotSent('checkin', slot, payload);
    }
  }

  const exchangeSlots = await getExchangeSlotSettings();
  for (const slot of exchangeSlots) {
    if (!isInSlotWindow(slot, now)) continue;
    sent += await sendIfSlotNotSent('exchange', slot, {
      text: 'Время обмена опытом! Задай вопрос или ответь коллегам.',
      hash: '#/exchange',
      category: 'exchange',
    });
  }

  const nfoConfig = await getNfoDayConfig();
  const nfoSlot = `${String(nfoConfig.publishHour).padStart(2, '0')}:${String(nfoConfig.publishMinute).padStart(2, '0')}`;
  if (isInSlotWindow(nfoSlot, now)) {
    sent += await sendIfSlotNotSent('nfo-day', nfoSlot, {
      text: 'Вечерняя рефлексия открыта. Поделись мыслями о прошедшем дне.',
      hash: '#/nfo-day',
      category: 'questions',
    });
  }

  return sent;
}

export async function runCronJob(jobName: string): Promise<{ ok: boolean; sent?: number }> {
  const job = CRON_JOBS[jobName];
  if (!job) {
    return { ok: false };
  }

  if (jobName === 'event-reminders') {
    const sent = await runEventReminders();
    return { ok: true, sent };
  }

  if (jobName === 'scheduled-broadcasts') {
    const sent = await runScheduledBroadcasts();
    return { ok: true, sent };
  }

  if (jobName === 'reflection-publish') {
    const sent = await runReflectionPublish();
    return { ok: true, sent };
  }

  if (jobName === 'dynamic-slots') {
    const sent = await runDynamicSlots();
    return { ok: true, sent };
  }

  const text = job.hash ? `${job.text}\n${job.hash}` : job.text!;

  if (job.isDiagnostics) {
    const enabledTracks = await getEnabledTracks();
    if (enabledTracks.length === 0) {
      return { ok: true, sent: 0 };
    }
    const result = await sendPush({
      text,
      targetType: 'track',
      targetTracks: enabledTracks,
      category: job.category,
      skipBroadcastLog: true,
    });
    return { ok: true, sent: result.sent };
  }

  const result = await sendPush({
    text,
    targetType: 'all',
    category: job.category,
    skipBroadcastLog: true,
  });

  return { ok: true, sent: result.sent };
}

export function listCronJobs(): string[] {
  return Object.keys(CRON_JOBS);
}
