import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { broadcasts, events } from '../db/schema.js';
import { sendPush, deliverPush } from './push.service.js';
import { getEnabledTracks } from './diagnostics.service.js';

const CRON_JOBS: Record<string, { text?: string; hour?: number; minute?: number; hash?: string; isDiagnostics?: boolean; custom?: boolean }> = {
  'morning-greeting': {
    text: 'Доброе утро! Сегодня отличный день на Форуме НФО. Открой расписание своего трека.',
    hour: 8,
    minute: 0,
    hash: '#/schedule',
  },
  'morning-checkin': {
    text: 'Утренний чек-ин: как ты себя чувствуешь? Займи 30 секунд.',
    hour: 8,
    minute: 30,
    hash: '#/checkin',
  },
  'daily-tasks': {
    text: 'Задания дня обновлены! Посмотри, что ждёт тебя сегодня.',
    hour: 9,
    minute: 0,
    hash: '#/tasks',
  },
  'lunch-exchange': {
    text: 'Обед — время обмена опытом! Задай вопрос или ответь коллегам.',
    hour: 13,
    minute: 15,
    hash: '#/exchange',
  },
  'evening-reflection': {
    text: 'Вечерняя рефлексия открыта. Поделись мыслями о прошедшем дне.',
    hour: 19,
    minute: 30,
    hash: '#/nfo-day',
  },
  goodnight: {
    text: 'Спокойной ночи! Завтра — новый день на Форуме НФО.',
    hour: 20,
    minute: 0,
  },
  'trainer-diagnostics': {
    text: 'Время оценить свои компетенции! Пройди самодиагностику тренера.',
    hour: 14,
    minute: 0,
    hash: '#/diagnostics',
    isDiagnostics: true,
  },
  'event-reminders': { custom: true },
  'scheduled-broadcasts': { custom: true },
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
    const trackFilter = event.track;
    const place = event.place ? ` · ${event.place}` : '';
    const text = `Через 10 минут: «${event.title}»${place}\n#/schedule`;

    const result = trackFilter
      ? await sendPush({ text, targetType: 'track', targetTracks: [trackFilter] })
      : await sendPush({ text, targetType: 'all' });

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
    });
    return { ok: true, sent: result.sent };
  }

  const result = await sendPush({
    text,
    targetType: 'all',
  });

  return { ok: true, sent: result.sent };
}

export function listCronJobs(): string[] {
  return Object.keys(CRON_JOBS);
}
