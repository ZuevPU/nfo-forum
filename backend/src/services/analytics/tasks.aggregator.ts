import { getTaskTimingSlot, median, safePercent, TASK_TIMING_LABELS } from './analyticsTime.js';
import type { AnalyticsContext } from './analyticsContext.js';
import type { TaskMetrics } from './analytics.types.js';

function eligibleUsers(ctx: AnalyticsContext, taskTrack: string | null): number {
  if (!taskTrack) return ctx.participants.length;
  return ctx.participants.filter((p) => p.track === taskTrack).length;
}

export function getTaskMetrics(ctx: AnalyticsContext): TaskMetrics {
  const publishedTasks = ctx.taskList.filter((t) => t.status === 'published');
  const approved = ctx.submissions.filter((s) => s.status === 'approved');

  const completion = publishedTasks.map((task) => {
    const eligible = eligibleUsers(ctx, task.track);
    const completedUsers = new Set(
      approved.filter((s) => s.taskId === task.id).map((s) => s.userId),
    );
    return {
      taskId: task.id,
      taskTitle: task.title,
      availableFor: task.track ?? 'Все',
      completed: completedUsers.size,
      eligible,
      completionPercent: safePercent(completedUsers.size, eligible),
    };
  });

  const timing = publishedTasks.map((task) => {
    const subs = approved.filter((s) => s.taskId === task.id);
    const slotCounts = { morning: 0, day: 0, evening: 0, night: 0 };
    const hoursAfterActivation: number[] = [];

    for (const sub of subs) {
      const slot = getTaskTimingSlot(sub.createdAt);
      slotCounts[slot]++;
      if (task.publishTime) {
        const hours = (sub.createdAt.getTime() - task.publishTime.getTime()) / (1000 * 60 * 60);
        if (hours >= 0) hoursAfterActivation.push(hours);
      }
    }

    const total = subs.length;
    const toPercent = (n: number) => (total > 0 ? safePercent(n, total) : null);

    return {
      taskId: task.id,
      taskTitle: task.title,
      morning: toPercent(slotCounts.morning),
      day: toPercent(slotCounts.day),
      evening: toPercent(slotCounts.evening),
      night: toPercent(slotCounts.night),
      medianHoursAfterActivation: median(hoursAfterActivation),
    };
  });

  void TASK_TIMING_LABELS;

  return { completion, timing };
}

export async function fetchTaskMetrics(): Promise<TaskMetrics> {
  const { loadAnalyticsContext } = await import('./analyticsContext.js');
  return getTaskMetrics(await loadAnalyticsContext());
}
