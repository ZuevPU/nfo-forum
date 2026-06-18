export type TaskContentStatus = 'draft' | 'scheduled' | 'published';

export interface TaskContentFields {
  status: string;
  publishTime?: Date | null;
}

/** Effective publication state: scheduled tasks become published once publishTime passes. */
export function resolveTaskContentStatus(
  task: TaskContentFields,
  now: Date = new Date(),
): TaskContentStatus {
  if (task.status === 'draft') return 'draft';
  if (task.publishTime && task.publishTime > now) return 'scheduled';
  return 'published';
}

export function isTaskVisibleToParticipant(
  task: TaskContentFields & { track?: string | null },
  userTrack: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (task.track && task.track !== userTrack) return false;
  return resolveTaskContentStatus(task, now) === 'published';
}
