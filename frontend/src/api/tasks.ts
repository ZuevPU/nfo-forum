import { apiRequest } from './client';

export function fetchTasks() {
  return apiRequest<{ tasks: TaskItem[] }>('/api/tasks');
}

export function fetchDailyFocus() {
  return apiRequest<{ focus: DailyFocus }>('/api/tasks/focus');
}

export function fetchTask(id: number) {
  return apiRequest(`/api/tasks/${id}`);
}

export function applyNetworkingTask(id: number) {
  return apiRequest<{ networking?: { status: string }; submission?: unknown }>(
    `/api/tasks/${id}/apply-networking`,
    { method: 'POST', body: {} },
  );
}

export function submitTask(id: number, answerText: string, photos?: string[]) {
  return apiRequest(`/api/tasks/${id}/submit`, {
    method: 'POST',
    body: { answer_text: answerText, photos },
  });
}

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  points: number;
  deadline: string | null;
  status: string;
  submissionCount: number;
  isPastDeadline: boolean;
  requiresPhoto: boolean;
  isRandomDistribution?: boolean;
  networkingStatus?: 'waiting' | 'paired' | null;
  partner?: { id: number; firstName: string; lastName: string | null; track: string | null } | null;
}

export interface DailyFocus {
  title: string;
  description: string;
}
