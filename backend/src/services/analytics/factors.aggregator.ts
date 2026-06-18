import { TRACKS } from '../../constants/tracks.js';
import { safePercent } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { FactorMetrics } from './analytics.types.js';

export function getFactorMetrics(ctx: AnalyticsContext): FactorMetrics {
  const factorCounts = new Map<string, number>();
  const factorByDay = new Map<string, Map<string, number>>();
  const factorByTrack = new Map<string, Map<string, Set<number>>>();

  const totalRespondents = new Set(ctx.nfoReflections.map((r) => r.userId)).size;

  for (const row of ctx.nfoReflections) {
    const user = ctx.participants.find((p) => p.id === row.userId);
    const track = user?.track ?? 'Без трека';
    const dayKey = String(row.date);

    for (const factor of row.factors ?? []) {
      factorCounts.set(factor, (factorCounts.get(factor) ?? 0) + 1);

      if (!factorByDay.has(factor)) factorByDay.set(factor, new Map());
      factorByDay.get(factor)!.set(dayKey, (factorByDay.get(factor)!.get(dayKey) ?? 0) + 1);

      if (!factorByTrack.has(factor)) factorByTrack.set(factor, new Map());
      if (!factorByTrack.get(factor)!.has(track)) factorByTrack.get(factor)!.set(track, new Set());
      factorByTrack.get(factor)!.get(track)!.add(row.userId);
    }
  }

  const topOverall = [...factorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([factor, count]) => ({
      factor,
      count,
      percent: safePercent(count, totalRespondents),
      byDay: ctx.forumDays.map((d) => ({
        dayKey: d.key,
        count: factorByDay.get(factor)?.get(d.key) ?? 0,
      })),
    }));

  const trackRespondents = new Map<string, Set<number>>();
  for (const row of ctx.nfoReflections) {
    const user = ctx.participants.find((p) => p.id === row.userId);
    const track = user?.track ?? 'Без трека';
    if (!trackRespondents.has(track)) trackRespondents.set(track, new Set());
    trackRespondents.get(track)!.add(row.userId);
  }

  const topFactors = [...factorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([factor]) => factor);

  const byTrack = topFactors.map((factor) => {
    const trackPercents: Record<string, number | null> = {};
    for (const track of TRACKS) {
      const respondents = trackRespondents.get(track)?.size ?? 0;
      const selected = factorByTrack.get(factor)?.get(track)?.size ?? 0;
      trackPercents[track] = safePercent(selected, respondents);
    }
    return { factor, trackPercents };
  });

  return { topOverall, byTrack };
}

export async function fetchFactorMetrics(): Promise<FactorMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getFactorMetrics(await loadAnalyticsContext());
}
