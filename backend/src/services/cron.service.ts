import { sendPush } from './push.service.js';
import { getEnabledTracks } from './diagnostics.service.js';

const CRON_JOBS: Record<string, { text: string; hour: number; minute: number; hash?: string; isDiagnostics?: boolean }> = {
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
    hash: '#/reflection',
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
  }
};

export async function runCronJob(jobName: string): Promise<{ ok: boolean; sent?: number }> {
  const job = CRON_JOBS[jobName];
  if (!job) {
    return { ok: false };
  }

  const text = job.hash ? `${job.text}\n${job.hash}` : job.text;

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
