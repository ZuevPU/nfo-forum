import { countWords, dynamicsPercent, median, safeAvg } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { ReflectionDepthMetrics } from './analytics.types.js';

function collectTexts(ctx: AnalyticsContext, userId?: number, dayKey?: string): number[] {
  const words: number[] = [];
  for (const a of ctx.reflectionAnswers) {
    if (userId != null && a.userId !== userId) continue;
    const key = a.createdAt.toISOString().slice(0, 10);
    if (dayKey && key !== dayKey) continue;
    words.push(countWords(a.answerText));
  }
  for (const a of ctx.nfoReflections) {
    if (userId != null && a.userId !== userId) continue;
    const key = String(a.date);
    if (dayKey && key !== dayKey) continue;
    words.push(countWords(a.answerText));
  }
  return words.filter((n) => n > 0);
}

export function getReflectionDepthMetrics(ctx: AnalyticsContext): ReflectionDepthMetrics {
  const overall = ctx.forumDays.map((day) => ({
    dayKey: day.key,
    dayLabel: day.label,
    avgWords: safeAvg(collectTexts(ctx, undefined, day.key)),
  }));

  const allWords = collectTexts(ctx);
  const overallMedian = median(allWords);

  const tracks = [...new Set(ctx.participants.map((p) => p.track).filter(Boolean))] as string[];

  const byTrack = tracks.map((track) => {
    const userIds = ctx.participants.filter((p) => p.track === track).map((p) => p.id);
    const byDay = ctx.forumDays.map((day) => {
      const dayWords: number[] = [];
      for (const uid of userIds) {
        dayWords.push(...collectTexts(ctx, uid, day.key));
      }
      return {
        dayKey: day.key,
        dayLabel: day.label,
        avgWords: safeAvg(dayWords),
      };
    });
    const first = byDay.find((d) => d.avgWords != null)?.avgWords ?? null;
    const last = [...byDay].reverse().find((d) => d.avgWords != null)?.avgWords ?? null;
    const allTrackWords: number[] = [];
    for (const uid of userIds) allTrackWords.push(...collectTexts(ctx, uid));
    return {
      track,
      byDay,
      dynamicsPercent: dynamicsPercent(first, last),
      medianWords: median(allTrackWords),
    };
  });

  return { overall, byTrack, overallMedian };
}

export async function fetchReflectionDepthMetrics(): Promise<ReflectionDepthMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getReflectionDepthMetrics(await loadAnalyticsContext());
}
