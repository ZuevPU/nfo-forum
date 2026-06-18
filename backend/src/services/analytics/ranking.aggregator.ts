import { addToBreakdown, mergeBreakdowns } from './pointsCategories.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { RankingMetrics } from './analytics.types.js';

export function getRankingMetrics(ctx: AnalyticsContext): RankingMetrics {
  const pointsByUser = new Map<number, ReturnType<typeof mergeBreakdowns>>();

  for (const row of ctx.pointsRows) {
    const breakdown = pointsByUser.get(row.userId) ?? mergeBreakdowns([]);
    addToBreakdown(breakdown, row.source, row.points);
    pointsByUser.set(row.userId, breakdown);
  }

  const sorted = [...ctx.participants].sort((a, b) => {
    const totalA = pointsByUser.get(a.id)?.total ?? a.points + a.reflectionPoints;
    const totalB = pointsByUser.get(b.id)?.total ?? b.points + b.reflectionPoints;
    return totalB - totalA;
  });

  const participants = sorted.map((p, i) => {
    const breakdown = pointsByUser.get(p.id) ?? mergeBreakdowns([]);
    return {
      position: i + 1,
      userId: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      track: p.track,
      totalPoints: breakdown.total,
      pointsBreakdown: breakdown,
      reflectionLevel: p.reflectionLevel,
    };
  });

  const trackMap = new Map<string, { total: number; count: number }>();
  for (const p of ctx.participants) {
    if (!p.track) continue;
    const breakdown = pointsByUser.get(p.id) ?? mergeBreakdowns([]);
    const entry = trackMap.get(p.track) ?? { total: 0, count: 0 };
    entry.total += breakdown.total;
    entry.count += 1;
    trackMap.set(p.track, entry);
  }

  const tracks = [...trackMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([track, data], i) => ({
      position: i + 1,
      track,
      totalPoints: data.total,
      avgPoints: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : null,
      participants: data.count,
    }));

  return { participants, tracks };
}

export async function fetchRankingMetrics(): Promise<RankingMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getRankingMetrics(await loadAnalyticsContext());
}
