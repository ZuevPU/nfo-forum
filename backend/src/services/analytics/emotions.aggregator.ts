import { resolveCheckinSlotLabel, safePercent } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { EmotionMetrics } from './analytics.types.js';

export function getEmotionMetrics(ctx: AnalyticsContext): EmotionMetrics {
  const totalCheckins = ctx.checkins.length;
  const emotionCounts = new Map<string, number>();

  for (const c of ctx.checkins) {
    const key = c.emotion.toLowerCase();
    emotionCounts.set(key, (emotionCounts.get(key) ?? 0) + 1);
  }

  const topOverall = [...emotionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, count]) => ({
      emotion,
      count,
      percent: safePercent(count, totalCheckins),
    }));

  const slotMap = new Map<string, Map<string, number>>();
  const slotRespondents = new Map<string, Set<number>>();

  for (const c of ctx.checkins) {
    const slotLabel = resolveCheckinSlotLabel(c.createdAt, ctx.checkinSettings);
    if (!slotMap.has(slotLabel)) slotMap.set(slotLabel, new Map());
    if (!slotRespondents.has(slotLabel)) slotRespondents.set(slotLabel, new Set());
    const emotions = slotMap.get(slotLabel)!;
    const key = c.emotion.toLowerCase();
    emotions.set(key, (emotions.get(key) ?? 0) + 1);
    slotRespondents.get(slotLabel)!.add(c.userId);
  }

  const bySlot = [...slotMap.entries()].map(([slotLabel, emotions]) => {
    const top = [...emotions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion, count], i) => ({ rank: i + 1, emotion, count }));
    return {
      slotLabel,
      respondents: slotRespondents.get(slotLabel)?.size ?? 0,
      top,
    };
  });

  return { topOverall, bySlot };
}

export async function fetchEmotionMetrics(): Promise<EmotionMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getEmotionMetrics(await loadAnalyticsContext());
}
