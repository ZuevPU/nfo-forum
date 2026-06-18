import { and, eq, gte, isNotNull, isNull, lte, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { broadcasts, events, reflectionQuestions, systemSettings } from '../db/schema.js';
import type { NotificationCategory } from '../constants/notifications.js';
import { sendPush, deliverPush, notifyUsersForTrack } from './push.service.js';
import { getEnabledTracks } from './diagnostics.service.js';
import { getCheckinSettings, getExchangeSlotSettings, getPushCheckinMascotMediaId, getPushMascotMediaId } from './admin.service.js';
import { getNfoDayConfig } from './reflection.service.js';
import { runNetworkingLunchPublishPush } from './networkingLunch.service.js';
import { isInSlotWindow, slotDedupKey } from '../utils/slotMatching.js';
import { appendAppLink, entityLink } from '../utils/appLinks.js';
import type { VkApiError } from './push.service.js';

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
    hash: entityLink('schedule'),
    category: 'program',
  },
  'daily-tasks': {
    text: 'Задания дня обновлены! Посмотри, что ждёт тебя сегодня.',
    hour: 9,
    minute: 0,
    hash: entityLink('tasks'),
    category: 'tasks',
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
    hash: entityLink('diagnostics'),
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
    const text = `Через 10 минут: «${event.title}»${place}`;

    const result = event.track
      ? await sendPush({
          text,
          hash: entityLink('schedule'),
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
    .where(
      and(
        isNull(broadcasts.sentAt),
        isNotNull(broadcasts.scheduledAt),
        lte(broadcasts.scheduledAt, now),
      ),
    );

  let sent = 0;
  for (const b of pending) {
    if (!b.scheduledAt) continue;

    const { sent: sentCount, vkError } = await deliverPush({
      text: b.text,
      image: b.image ?? undefined,
      imageMediaId: b.imageMediaId ?? undefined,
      linkHash: b.linkHash ?? undefined,
      targetType: b.targetType as 'all' | 'track' | 'user',
      targetTracks: b.targetTracks ?? undefined,
      targetUserId: b.targetUserId ?? undefined,
    });

    if (vkError) {
      console.error(`[cron] scheduled broadcast #${b.id} failed:`, vkError);
      continue;
    }

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
        ne(reflectionQuestions.type, 'evening'),
        ne(reflectionQuestions.type, 'insight'),
      ),
    );

  let sent = 0;
  for (const q of due) {
    const text = `Новый вопрос для рефлексии: ${q.text.slice(0, 80)}${q.text.length > 80 ? '…' : ''}`;
    const result = await notifyUsersForTrack(q.track, text, 'questions', entityLink('questions', q.id), 'Открыть вопрос');
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

type SlotPushPayload = {
  text: string;
  hash?: string;
  category: NotificationCategory;
  imageMediaId?: string;
};

async function sendIfSlotNotSent(
  type: string,
  slot: string,
  payload: SlotPushPayload,
): Promise<number> {
  const key = slotDedupKey(type, slot);
  const dedup = await getCronDedup();
  if (dedup[key]) return 0;

  const text = payload.hash ? appendAppLink(payload.text, payload.hash) : payload.text;
  const result = await sendPush({
    text,
    imageMediaId: payload.imageMediaId,
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
  payload: SlotPushPayload,
): Promise<number> {
  const key = slotDedupKey(type, slot);
  const dedup = await getCronDedup();
  if (dedup[key]) return 0;

  const text = payload.hash ? appendAppLink(payload.text, payload.hash) : payload.text;
  const result = await sendPush({
    text,
    imageMediaId: payload.imageMediaId,
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
  const checkinMascot = await getPushCheckinMascotMediaId();
  const nfoMascot = await getPushMascotMediaId();

  const checkin = await getCheckinSettings();
  for (const slot of checkin.slots) {
    if (!isInSlotWindow(slot, now)) continue;
    const payload: SlotPushPayload = {
      text: 'Время посмотреть на своё состояние и ответить на короткий вопрос.',
      hash: entityLink('checkin'),
      category: 'program',
      imageMediaId: checkinMascot,
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
      hash: entityLink('exchange'),
      category: 'exchange',
      imageMediaId: nfoMascot,
    });
  }

  const nfoConfig = await getNfoDayConfig();
  const nfoSlot = `${String(nfoConfig.publishHour).padStart(2, '0')}:${String(nfoConfig.publishMinute).padStart(2, '0')}`;
  if (isInSlotWindow(nfoSlot, now)) {
    sent += await sendIfSlotNotSent('nfo-day', nfoSlot, {
      text: 'Настало время подвести итоги дня.',
      hash: entityLink('nfo-day'),
      category: 'questions',
      imageMediaId: nfoMascot,
    });
  }

  sent += await runNetworkingLunchPublishPush(now, nfoMascot);

  return sent;
}

export async function runCronJob(
  jobName: string,
): Promise<{ ok: boolean; sent?: number; vkError?: VkApiError | null }> {
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

  const text = job.text!;
  const mascotMediaId = await getPushMascotMediaId();

  if (job.isDiagnostics) {
    const enabledTracks = await getEnabledTracks();
    if (enabledTracks.length === 0) {
      return { ok: true, sent: 0 };
    }
    const result = await sendPush({
      text,
      hash: job.hash,
      linkHash: job.hash,
      imageMediaId: mascotMediaId,
      targetType: 'track',
      targetTracks: enabledTracks,
      category: job.category,
      skipBroadcastLog: true,
    });
    return { ok: true, sent: result.sent, vkError: result.vkError };
  }

  const result = await sendPush({
    text,
    hash: job.hash,
    linkHash: job.hash,
    imageMediaId: mascotMediaId,
    targetType: 'all',
    category: job.category,
    skipBroadcastLog: true,
  });

  return { ok: true, sent: result.sent, vkError: result.vkError };
}

export function listCronJobs(): string[] {
  return Object.keys(CRON_JOBS);
}
