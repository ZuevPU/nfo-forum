import { loadAnalyticsContext } from './analyticsContext.js';
import { getActivityMetrics } from './activity.aggregator.js';
import { getDiagnosticsMetrics } from './diagnostics.aggregator.js';
import { getEmotionMetrics } from './emotions.aggregator.js';
import { getEnergyMetrics } from './energy.aggregator.js';
import { getFactorMetrics } from './factors.aggregator.js';
import { getAnalyticsOverview } from './overview.aggregator.js';
import { getRankingMetrics } from './ranking.aggregator.js';
import { getReflectionDepthMetrics } from './reflectionDepth.aggregator.js';
import { getTaskMetrics } from './tasks.aggregator.js';
import { loadAnalyticsRawData } from './rawData.loader.js';
import type { AnalyticsBundle } from './analytics.types.js';

export { fetchAnalyticsOverview } from './overview.aggregator.js';
export { fetchActivityMetrics } from './activity.aggregator.js';
export { fetchEnergyMetrics } from './energy.aggregator.js';
export { fetchEmotionMetrics } from './emotions.aggregator.js';
export { fetchFactorMetrics } from './factors.aggregator.js';
export { fetchTaskMetrics } from './tasks.aggregator.js';
export { fetchDiagnosticsMetrics } from './diagnostics.aggregator.js';
export { fetchRankingMetrics } from './ranking.aggregator.js';
export { fetchReflectionDepthMetrics } from './reflectionDepth.aggregator.js';
export { buildReportWorkbook, getReportFilename } from './excel/buildReportWorkbook.js';

export async function getAnalyticsBundle(): Promise<AnalyticsBundle> {
  const ctx = await loadAnalyticsContext(true);
  const [raw] = await Promise.all([loadAnalyticsRawData()]);

  return {
    overview: getAnalyticsOverview(ctx),
    activity: getActivityMetrics(ctx),
    energy: getEnergyMetrics(ctx),
    emotions: getEmotionMetrics(ctx),
    factors: getFactorMetrics(ctx),
    tasks: getTaskMetrics(ctx),
    diagnostics: getDiagnosticsMetrics(ctx),
    ranking: getRankingMetrics(ctx),
    reflectionDepth: getReflectionDepthMetrics(ctx),
    raw,
  };
}
