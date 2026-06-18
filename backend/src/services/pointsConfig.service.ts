import { awardAction } from './pointsEngine.service.js';

const LEGACY_SOURCE_MAP: Record<string, string> = {
  reflection_answer: 'reflection_answer',
  task_submission: 'task_submission',
  exchange_question: 'exchange_question',
  exchange_answer: 'exchange_answer',
  nfo_day_reflection: 'nfo_thesis',
  checkin: 'checkin_emotion',
  diagnostics_complete: 'diagnostics_complete_entry',
};

/** @deprecated Prefer awardAction(actionId) directly */
export async function awardPointsForSource(
  userId: number,
  source: string,
  sourceId?: number,
  comment?: string,
  reflectionPoints = 0,
  overridePoints?: number,
): Promise<void> {
  const actionId = LEGACY_SOURCE_MAP[source] ?? source;
  if (actionId === 'task_submission') {
    const { awardPoints } = await import('./points.service.js');
    const amount = overridePoints ?? reflectionPoints ?? 0;
    if (amount > 0) {
      await awardPoints(userId, amount, 'task_submission', sourceId, comment, 0, amount);
    }
    return;
  }

  await awardAction(userId, actionId, sourceId, {
    pointsOverride: overridePoints ?? (reflectionPoints > 0 ? reflectionPoints : undefined),
    comment,
    skipIfSourceIdExists: true,
  });
}

export { awardAction };
