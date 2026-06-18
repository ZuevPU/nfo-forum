import { DIAGNOSTICS_DATA } from '../../data/samodiagnostika.js';
import { safeAvg } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { DiagnosticsMetrics } from './analytics.types.js';

export function getDiagnosticsMetrics(ctx: AnalyticsContext): DiagnosticsMetrics {
  const entryScores = new Map<number, number[]>();
  const exitScores = new Map<number, number[]>();

  for (const row of ctx.diagnostics) {
    const target = row.attemptNumber <= 1 ? entryScores : exitScores;
    if (!target.has(row.blockId)) target.set(row.blockId, []);
    target.get(row.blockId)!.push(row.score);
  }

  const skills = DIAGNOSTICS_DATA.skills.map((skill) => {
    const entryAvg = safeAvg(entryScores.get(skill.id) ?? []);
    const exitAvg = safeAvg(exitScores.get(skill.id) ?? []);
    const delta =
      entryAvg != null && exitAvg != null
        ? Math.round((exitAvg - entryAvg) * 10) / 10
        : null;
    return {
      skillId: skill.id,
      skillTitle: skill.title,
      entryAvg,
      exitAvg,
      delta,
    };
  });

  return { skills };
}

export async function fetchDiagnosticsMetrics(): Promise<DiagnosticsMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getDiagnosticsMetrics(await loadAnalyticsContext());
}
