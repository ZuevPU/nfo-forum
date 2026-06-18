import { moscowDateString } from '../../utils/moscowTime.js';
import { safePercent } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { ActivityMetrics, SlotActivityRow } from './analytics.types.js';

const ACTION_TYPES: { key: string; actions: readonly string[]; label: string }[] = [
  { key: 'checkin', actions: ['state_checkin'], label: 'Чек-ин' },
  { key: 'reflection', actions: ['answer_reflection', 'nfo_day_submit'], label: 'Вопрос / рефлексия' },
  { key: 'task', actions: ['submit_task'], label: 'Задание' },
  { key: 'exchange', actions: ['ask_exchange', 'answer_exchange', 'view_exchange'], label: 'Обмен опытом' },
  { key: 'schedule', actions: ['open_schedule'], label: 'Просмотр программы' },
  { key: 'any', actions: [], label: 'Любое действие (итого)' },
];

function usersRegisteredByDay(participants: AnalyticsContext['participants'], dayKey: string): number {
  const end = new Date(`${dayKey}T23:59:59.999+03:00`);
  return participants.filter((p) => p.createdAt <= end).length;
}

function usersVisitedByDay(ctx: AnalyticsContext, dayKey: string): number {
  const ids = new Set<number>();
  for (const log of ctx.activityLogs) {
    if (moscowDateString(log.createdAt) === dayKey) ids.add(log.userId);
  }
  for (const p of ctx.participants) {
    if (moscowDateString(p.lastActiveAt) === dayKey) ids.add(p.id);
  }
  return ids.size;
}

function usersAnsweredByDay(ctx: AnalyticsContext, dayKey: string): number {
  const ids = new Set<number>();
  for (const a of ctx.reflectionAnswers) {
    if (moscowDateString(a.createdAt) === dayKey) ids.add(a.userId);
  }
  for (const a of ctx.nfoReflections) {
    if (String(a.date) === dayKey || moscowDateString(a.createdAt) === dayKey) ids.add(a.userId);
  }
  return ids.size;
}

function slotKey(dayKey: string, hour: number): string {
  let slot = 'ночь';
  if (hour >= 6 && hour < 12) slot = 'утро';
  else if (hour >= 12 && hour < 17) slot = 'день';
  else if (hour >= 17 && hour < 22) slot = 'вечер';
  return `${dayKey} ${slot}`;
}

function slotPercentForAction(
  ctx: AnalyticsContext,
  dayKey: string,
  hourStart: number,
  hourEnd: number,
  actionFilter: (action: string) => boolean,
): number | null {
  const registered = usersRegisteredByDay(ctx.participants, dayKey);
  if (registered <= 0) return null;
  const ids = new Set<number>();
  for (const log of ctx.activityLogs) {
    const d = log.createdAt;
    if (moscowDateString(d) !== dayKey) continue;
    const hour = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Moscow' })).getHours();
    if (hour < hourStart || hour >= hourEnd) continue;
    if (actionFilter(log.action)) ids.add(log.userId);
  }
  return safePercent(ids.size, registered);
}

export function getActivityMetrics(ctx: AnalyticsContext): ActivityMetrics {
  const rows = ctx.forumDays.map((day) => {
    const registeredCumulative = usersRegisteredByDay(ctx.participants, day.key);
    const visited = usersVisitedByDay(ctx, day.key);
    const answeredQuestion = usersAnsweredByDay(ctx, day.key);
    return {
      dayKey: day.key,
      dayLabel: day.label,
      registeredCumulative,
      visited,
      activePercent: safePercent(visited, registeredCumulative),
      answeredQuestion,
      answeredPercent: safePercent(answeredQuestion, registeredCumulative),
    };
  });

  const slotColumns = ctx.forumDays.flatMap((d) => [
    `${d.label} утро`,
    `${d.label} день`,
    `${d.label} вечер`,
    `${d.label} ночь`,
  ]);

  const slotActivity: SlotActivityRow[] = ACTION_TYPES.map(({ key, actions, label }) => {
    const values: Record<string, number | null> = {};
    for (const day of ctx.forumDays) {
      const ranges: [number, number, string][] = [
        [6, 12, `${day.label} утро`],
        [12, 17, `${day.label} день`],
        [17, 22, `${day.label} вечер`],
        [22, 24, `${day.label} ночь`],
      ];
      for (const [start, end, slotLabel] of ranges) {
        const filter =
          key === 'any'
            ? () => true
            : (action: string) => actions.includes(action);
        values[slotLabel] = slotPercentForAction(ctx, day.key, start, end === 24 ? 24 : end, filter);
      }
    }
    return {
      slotLabel: slotKey('x', 12).split(' ')[1] ?? '',
      actionType: label,
      values,
    };
  });

  void slotColumns;

  return { days: ctx.forumDays, rows, slotActivity };
}

export async function fetchActivityMetrics(): Promise<ActivityMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getActivityMetrics(await loadAnalyticsContext());
}
