import { moscowDateString } from '../../utils/moscowTime.js';
import { countWords, safeAvg, safePercent } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { AnalyticsOverview } from './analytics.types.js';

export function getAnalyticsOverview(ctx: AnalyticsContext): AnalyticsOverview {
  const registered = ctx.participants.length;
  const participantIds = new Set(ctx.participants.map((p) => p.id));

  const activeUserIds = new Set<number>();
  for (const log of ctx.activityLogs) {
    if (participantIds.has(log.userId)) activeUserIds.add(log.userId);
  }
  for (const p of ctx.participants) {
    if (p.lastActiveAt) activeUserIds.add(p.id);
  }

  const energies = ctx.checkins.map((c) => c.energyLevel);
  const avgEnergy = safeAvg(energies);

  const textSamples = [
    ...ctx.reflectionAnswers.map((a) => a.answerText),
    ...ctx.nfoReflections.map((a) => a.answerText),
  ];
  const avgReflectionDepth = safeAvg(textSamples.map(countWords).filter((n) => n > 0));

  const approvedSubmissions = ctx.submissions.filter((s) => s.status === 'approved');
  const tasksTotal = ctx.taskList.filter((t) => t.status === 'published').length;
  const tasksCompleted = new Set(approvedSubmissions.map((s) => `${s.userId}:${s.taskId}`)).size;

  const reflectionAnswerCount = ctx.reflectionAnswers.length + ctx.nfoReflections.length;

  return {
    registered,
    activePercent: safePercent(activeUserIds.size, registered) ?? 0,
    avgEnergy,
    avgReflectionDepth,
    tasksCompleted: approvedSubmissions.length,
    tasksTotal,
    tasksCompletionPercent: safePercent(
      new Set(approvedSubmissions.map((s) => s.taskId)).size,
      tasksTotal,
    ),
    reflectionAnswers: reflectionAnswerCount,
    checkins: ctx.checkins.length,
  };
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  const ctx = await loadAnalyticsContext();
  return getAnalyticsOverview(ctx);
}
