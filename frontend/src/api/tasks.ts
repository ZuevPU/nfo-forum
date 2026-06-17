import { apiRequest } from './client';

export function fetchTasks() {
  return apiRequest<{ tasks: TaskItem[] }>('/api/tasks');
}

export function fetchDailyFocus() {
  return apiRequest<{ focus: DailyFocus }>('/api/tasks/focus');
}

export function fetchTask(id: number) {
  return apiRequest<TaskDetailResponse>(`/api/tasks/${id}`);
}

interface TaskDetailResponse {
  task: {
    id: number;
    title: string;
    description: string;
    points: number;
    deadline: string | null;
    requiresPhoto: boolean;
    isRandomDistribution: boolean;
  };
  submissions: Array<{ status: string }>;
}

export function taskFromDetail(data: TaskDetailResponse): TaskItem {
  const latest = data.submissions[data.submissions.length - 1];
  const deadline = data.task.deadline;
  return {
    id: data.task.id,
    title: data.task.title,
    description: data.task.description,
    points: data.task.points,
    deadline,
    status: latest?.status ?? 'new',
    submissionCount: data.submissions.length,
    isPastDeadline: deadline ? new Date() > new Date(deadline) : false,
    requiresPhoto: data.task.requiresPhoto,
    isRandomDistribution: data.task.isRandomDistribution,
  };
}

export function applyNetworkingTask(id: number) {
  return apiRequest<{ networking?: { status: string }; submission?: unknown }>(
    `/api/tasks/${id}/apply-networking`,
    { method: 'POST', body: {} },
  );
}

export function submitTask(id: number, answerText: string, photos?: string[]) {
  return apiRequest<{ submission: { status: string } }>(`/api/tasks/${id}/submit`, {
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
  networkingContacts?: number;
  networkingMode?: 'pair' | 'multi';
  contactsRequired?: number;
  networkingStatus?: 'waiting' | 'paired' | null;
  partner?: { id: number; firstName: string; lastName: string | null; track: string | null } | null;
  partners?: { id: number; firstName: string; lastName: string | null; track: string | null }[];
}

export interface DailyFocus {
  title: string;
  description: string;
}
