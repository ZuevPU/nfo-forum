export type NotificationCategory = 'program' | 'questions' | 'tasks' | 'exchange' | 'points';

export interface NotificationPrefs {
  program: boolean;
  questions: boolean;
  tasks: boolean;
  exchange: boolean;
  points: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  program: true,
  questions: true,
  tasks: true,
  exchange: true,
  points: true,
};

export function shouldNotify(
  notificationsEnabled: boolean,
  prefs: NotificationPrefs | null | undefined,
  category: NotificationCategory,
): boolean {
  if (!notificationsEnabled) return false;
  const p = prefs ?? DEFAULT_NOTIFICATION_PREFS;
  return p[category] ?? true;
}
