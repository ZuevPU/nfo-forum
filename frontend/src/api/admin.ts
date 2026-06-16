import { apiRequest } from './client';

export function fetchAdminEvents() {
  return apiRequest<{ events: AdminEvent[] }>('/api/admin/events');
}

export function createAdminEvent(data: Partial<AdminEvent>) {
  return apiRequest('/api/admin/events', { method: 'POST', body: data });
}

export function updateAdminEvent(id: number, data: Partial<AdminEvent>) {
  return apiRequest(`/api/admin/events/${id}`, { method: 'PATCH', body: data });
}

export function deleteAdminEvent(id: number) {
  return apiRequest(`/api/admin/events/${id}`, { method: 'DELETE' });
}

export function fetchAdminTasks() {
  return apiRequest<{ tasks: AdminTask[] }>('/api/admin/tasks');
}

export function createAdminTask(data: Partial<AdminTask> & { description: string }) {
  return apiRequest('/api/admin/tasks', { method: 'POST', body: data });
}

export function updateAdminTask(id: number, data: Partial<AdminTask>) {
  return apiRequest(`/api/admin/tasks/${id}`, { method: 'PATCH', body: data });
}

export function deleteAdminTask(id: number) {
  return apiRequest(`/api/admin/tasks/${id}`, { method: 'DELETE' });
}

export function fetchPendingExchange() {
  return apiRequest<{ questions: PendingQuestion[] }>('/api/admin/exchange/pending');
}

export function moderateExchange(id: number, status: 'approved' | 'rejected', publishTime?: string) {
  return apiRequest(`/api/admin/exchange/${id}/moderate`, { method: 'POST', body: { status, publishTime } });
}

export function fetchPendingSubmissions() {
  return apiRequest<{ submissions: PendingSubmission[] }>('/api/admin/submissions/pending');
}

export function moderateSubmission(id: number, status: 'approved' | 'rejected') {
  return apiRequest(`/api/admin/submissions/${id}/moderate`, { method: 'POST', body: { status } });
}

export function fetchReflectionQuestions() {
  return apiRequest<{ questions: ReflectionQuestion[] }>('/api/admin/reflection-questions');
}

export function createReflectionQuestion(data: {
  text: string;
  type: string;
  publishTime: string;
  endTime?: string | null;
  points?: number;
  sendNotification?: boolean;
  groupId?: string | null;
  track?: string | null;
}) {
  return apiRequest('/api/admin/reflection-questions', { method: 'POST', body: data });
}

export function deleteReflectionQuestion(id: number) {
  return apiRequest(`/api/admin/reflection-questions/${id}`, { method: 'DELETE' });
}

export function sendAdminPush(payload: {
  text: string;
  image?: string;
  target_type: 'all' | 'track' | 'user';
  target_tracks?: string[];
  target_user_id?: number;
  scheduled_at?: string;
}) {
  return apiRequest('/api/admin/push/send', { method: 'POST', body: payload });
}

export function fetchBroadcasts() {
  return apiRequest<{ broadcasts: Broadcast[] }>('/api/admin/broadcasts');
}

// Diagnostics
export function fetchDiagnosticsSettings() {
  return apiRequest<{ tracks: string[] }>('/api/admin/diagnostics/settings');
}

export function saveDiagnosticsSettings(tracks: string[]) {
  return apiRequest('/api/admin/diagnostics/settings', {
    method: 'POST',
    body: { tracks },
  });
}

export interface DiagnosticResult {
  id: number;
  userId: number;
  blockId: number;
  questionId: number;
  score: number;
  attemptNumber: number;
  comment: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string | null;
    track: string | null;
  } | null;
}

export function fetchDiagnosticsResults() {
  return apiRequest<{ results: DiagnosticResult[] }>('/api/admin/diagnostics/results');
}

export function getDiagnosticsExportUrl() {
  return '/api/admin/diagnostics/export';
}

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  points: number;
  role: string;
  createdAt: string;
}

export interface FeedbackMessage {
  id: number;
  text: string;
  createdAt: string;
  userId: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
}

export function fetchAdminUsers(track?: string) {
  const q = track ? `?track=${encodeURIComponent(track)}` : '';
  return apiRequest<{ users: AdminUser[] }>(`/api/admin/users${q}`);
}

export function adjustUserPoints(userId: number, points: number, comment: string) {
  return apiRequest(`/api/admin/users/${userId}/points`, {
    method: 'POST',
    body: { points, comment },
  });
}

export function fetchFeedbackMessages() {
  return apiRequest<{ messages: FeedbackMessage[] }>('/api/admin/feedback');
}

export function fetchPointsSettings() {
  return apiRequest<{ config: Record<string, number> }>('/api/admin/settings/points');
}

export function savePointsSettings(config: Record<string, number>) {
  return apiRequest('/api/admin/settings/points', { method: 'POST', body: config });
}

export function getAdminExportUrl(type: string) {
  return `/api/admin/export/${type}`;
}

export interface Broadcast {
  id: number;
  text: string;
  targetType: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}
export interface AdminEvent {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  place: string | null;
  track: string | null;
  isKeyBlock?: boolean;
}

export interface AdminTask {
  id: number;
  title: string;
  description: string;
  points: number;
  track: string | null;
  allowMultiple?: boolean;
  deadline?: string | null;
  requiresPhoto?: boolean;
  sendNotification?: boolean;
  isFocusOfDay?: boolean;
  isRandomDistribution?: boolean;
  autoApprove?: boolean;
}

export interface PendingQuestion {
  id: number;
  text: string;
  status: string;
}

export interface PendingSubmission {
  id: number;
  taskId: number;
  answerText: string | null;
  status: string;
}

export interface ReflectionQuestion {
  id: number;
  text: string;
  type: string;
  publishTime: string;
  endTime: string | null;
  points: number;
  sendNotification: boolean;
  groupId: string | null;
  track: string | null;
}
