import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  nfoDayReflections,
  reflectionAnswers,
  stateCheckins,
  taskSubmissions,
  userActivityLogs,
  users,
} from '../../db/schema.js';
import {
  formatMoscowDate,
  FORUM_DAYS,
  moscowDateString,
  moscowTimeParts,
  programDayFromMsk,
} from '../../utils/moscowTime.js';
import {
  getCheckinSlotLabel,
  mapCheckinToIntervalIndex,
  mapCheckinToSlotIndex,
  type CheckinInterval,
} from '../../utils/slotMatching.js';
import type { CheckinSettingsValue } from '../admin.service.js';
import { getCheckinSettings } from '../admin.service.js';
import type { ForumDayColumn } from './analytics.types.js';

const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatForumDayLabel(dayKey: string): string {
  const [, month, day] = dayKey.split('-').map(Number);
  if (!month || !day) return dayKey;
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

export function formatMoscowTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatMoscowDateTime(date: Date): string {
  return `${formatForumDayLabel(moscowDateString(date))} ${formatMoscowTime(date)}`;
}

export function countWords(text: string | null | undefined): number {
  if (!text?.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function safePercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

export function safeAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function formatDelta(delta: number | null): string {
  if (delta == null || Number.isNaN(delta)) return '—';
  const rounded = Math.round(delta * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

export function formatNullableNumber(value: number | null, suffix = ''): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}${suffix}`;
}

export function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }
  return sorted[mid];
}

export function getTaskTimingSlot(date: Date): 'morning' | 'day' | 'evening' | 'night' {
  const { hours } = moscowTimeParts(date);
  if (hours >= 8 && hours < 10) return 'morning';
  if (hours >= 14 && hours < 17) return 'day';
  if (hours >= 19 && hours < 21) return 'evening';
  return 'night';
}

export const TASK_TIMING_LABELS = {
  morning: 'Утро 8–10',
  day: 'День 14–17',
  evening: 'Вечер 19–21',
  night: 'Ночь 21+',
} as const;

export async function getForumDayColumns(): Promise<ForumDayColumn[]> {
  const [minMax] = await db
    .select({
      minDate: sql<string>`least(
        coalesce((select min(${users.createdAt}) from ${users}), now()),
        coalesce((select min(${stateCheckins.createdAt}) from ${stateCheckins}), now()),
        coalesce((select min(${reflectionAnswers.createdAt}) from ${reflectionAnswers}), now()),
        coalesce((select min(${nfoDayReflections.createdAt}) from ${nfoDayReflections}), now()),
        coalesce((select min(${taskSubmissions.createdAt}) from ${taskSubmissions}), now()),
        coalesce((select min(${userActivityLogs.createdAt}) from ${userActivityLogs}), now())
      )`,
      maxDate: sql<string>`greatest(
        coalesce((select max(${users.createdAt}) from ${users}), now()),
        coalesce((select max(${stateCheckins.createdAt}) from ${stateCheckins}), now()),
        coalesce((select max(${reflectionAnswers.createdAt}) from ${reflectionAnswers}), now()),
        coalesce((select max(${nfoDayReflections.createdAt}) from ${nfoDayReflections}), now()),
        coalesce((select max(${taskSubmissions.createdAt}) from ${taskSubmissions}), now()),
        coalesce((select max(${userActivityLogs.createdAt}) from ${userActivityLogs}), now())
      )`,
    })
    .from(users)
    .limit(1);

  const forumKeys = FORUM_DAYS.map((d) => d.key);
  if (forumKeys.length > 0) {
    return forumKeys.map((key) => ({ key, label: formatForumDayLabel(key) }));
  }

  const startKey = moscowDateString(new Date(minMax?.minDate ?? Date.now()));
  const endKey = moscowDateString(new Date(minMax?.maxDate ?? Date.now()));
  const days: ForumDayColumn[] = [];
  const cursor = new Date(`${startKey}T12:00:00+03:00`);
  const end = new Date(`${endKey}T12:00:00+03:00`);

  while (cursor <= end) {
    const key = moscowDateString(cursor);
    days.push({ key, label: formatForumDayLabel(key) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days.length ? days : [{ key: moscowDateString(), label: formatMoscowDate() }];
}

export function resolveCheckinSlotLabel(
  createdAt: Date,
  settings: CheckinSettingsValue,
): string {
  const programDay = programDayFromMsk(createdAt);
  const daySettings = programDay
    ? settings.byDay?.[String(programDay) as '1' | '2' | '3' | '4']
    : undefined;
  const slots = daySettings?.slots?.length ? daySettings.slots : settings.slots;
  const intervals = (daySettings?.intervals ?? settings.intervals) as CheckinInterval[] | undefined;

  if (intervals?.length) {
    const idx = mapCheckinToIntervalIndex(createdAt, intervals);
    if (idx != null) {
      return intervals[idx].label ?? getCheckinSlotLabel(idx);
    }
  }

  const slotIdx = mapCheckinToSlotIndex(createdAt, slots);
  if (slotIdx != null) return getCheckinSlotLabel(slotIdx);

  const { hours } = moscowTimeParts(createdAt);
  if (hours < 12) return 'Утренний чек-in';
  if (hours < 17) return 'Дневной чек-in';
  if (hours < 22) return 'Вечерний чек-in';
  return 'Ночной чек-in';
}

export function resolveCheckinSlotKey(createdAt: Date, settings: CheckinSettingsValue): string {
  const dayKey = moscowDateString(createdAt);
  const label = resolveCheckinSlotLabel(createdAt, settings);
  return `${dayKey}:${label}`;
}

export function dynamicsPercent(first: number | null, last: number | null): number | null {
  if (first == null || last == null || first === 0) return null;
  return Math.round(((last - first) / first) * 100);
}
