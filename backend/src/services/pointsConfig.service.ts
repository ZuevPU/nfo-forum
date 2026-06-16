import { getPointsSettings } from './admin.service.js';
import { awardPoints } from './points.service.js';

const SOURCE_TO_CONFIG_KEY: Record<string, string> = {
  reflection_answer: 'reflection_answer',
  task_submission: 'task_submission',
  exchange_question: 'exchange_question',
  exchange_answer: 'exchange_answer',
  nfo_day_reflection: 'nfo_day_reflection',
  checkin: 'checkin',
  diagnostics_complete: 'diagnostics_complete',
};

export async function awardPointsForSource(
  userId: number,
  source: string,
  sourceId?: number,
  comment?: string,
  reflectionPoints = 0,
  overridePoints?: number,
): Promise<void> {
  let points = overridePoints;
  if (points === undefined) {
    const config = await getPointsSettings();
    const key = SOURCE_TO_CONFIG_KEY[source] ?? source;
    points = (config as Record<string, number>)[key] ?? 0;
  }
  if (points === 0 && reflectionPoints === 0) return;
  await awardPoints(userId, points, source, sourceId, comment, reflectionPoints);
}
