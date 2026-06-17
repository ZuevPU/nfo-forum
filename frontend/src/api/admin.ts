import { apiRequest, downloadApiFile } from './client';

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

export function hideExchangeQuestion(id: number) {
  return apiRequest(`/api/admin/exchange/${id}/hide`, { method: 'POST' });
}

export function fetchPendingSubmissions() {
  return apiRequest<{ submissions: PendingSubmission[] }>('/api/admin/submissions/pending');
}

export function moderateSubmission(id: number, status: 'approved' | 'rejected', adminComment?: string) {
  return apiRequest(`/api/admin/submissions/${id}/moderate`, {
    method: 'POST',
    body: { status, admin_comment: adminComment },
  });
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
  allowMultiple?: boolean;
}) {
  return apiRequest('/api/admin/reflection-questions', { method: 'POST', body: data });
}

export function deleteReflectionQuestion(id: number) {
  return apiRequest(`/api/admin/reflection-questions/${id}`, { method: 'DELETE' });
}

export function sendAdminPush(payload: {
  text: string;
  image?: string;
  image_media_id?: string;
  link_hash?: string;
  target_type: 'all' | 'track' | 'user';
  target_tracks?: string[];
  target_user_id?: number;
  scheduled_at?: string;
}) {
  return apiRequest<{
    sent: number;
    scheduled?: boolean;
    candidates?: number;
    eligible?: number;
    vkError?: { error_code?: number; error_msg?: string };
  }>('/api/admin/push/send', { method: 'POST', body: payload });
}

export interface PushSubscriptionStats {
  total: number;
  withMessages: number;
  fullyEligible: number;
  withoutMessages: number;
  adminsTotal: number;
  adminsWithMessages: number;
  participantsTotal: number;
  participantsWithMessages: number;
}

export function fetchPushStats() {
  return apiRequest<{ stats: PushSubscriptionStats }>('/api/admin/push/stats');
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

export function fetchReflectionLevelSettings() {
  return apiRequest<{ thresholds: number[] }>('/api/admin/settings/reflection-levels');
}

export function saveReflectionLevelSettings(thresholds: number[]) {
  return apiRequest('/api/admin/settings/reflection-levels', { method: 'POST', body: { thresholds } });
}

export type AdminExportType =
  | 'reflection'
  | 'tasks'
  | 'exchange'
  | 'rating'
  | 'checkins'
  | 'nfo-day'
  | 'points-history'
  | 'activity';

export function downloadAdminExport(type: AdminExportType, format: 'csv' | 'xlsx') {
  const path = format === 'xlsx' ? `/api/admin/export/${type}/xlsx` : `/api/admin/export/${type}`;
  return downloadApiFile(path, `${type}.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
}

export function fetchNfoDaySettings() {
  return apiRequest<{
    publishHour: number;
    publishMinute: number;
    points: number;
    question?: string;
    panelTitle?: string;
    panelSubtitle?: string;
    factors?: string[];
  }>('/api/admin/settings/nfo-day');
}

export function saveNfoDaySettings(data: {
  publishHour: number;
  publishMinute: number;
  points: number;
  question?: string;
  panelTitle?: string;
  panelSubtitle?: string;
  factors?: string[];
}) {
  return apiRequest('/api/admin/settings/nfo-day', { method: 'POST', body: data });
}

export function fetchDailyFocusSettings() {
  return apiRequest<{ title: string; taskId: number | null }>('/api/admin/settings/daily-focus');
}

export function saveDailyFocusSettings(title: string, taskId?: number | null) {
  return apiRequest('/api/admin/settings/daily-focus', { method: 'POST', body: { title, taskId } });
}

export function fetchReflectionAnswers(track?: string, day?: string) {
  const params = new URLSearchParams();
  if (track) params.set('track', track);
  if (day) params.set('day', day);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<{ answers: ReflectionAnswerRow[] }>(`/api/admin/reflection-answers${q}`);
}

export function updateReflectionQuestion(id: number, data: Partial<ReflectionQuestion>) {
  return apiRequest(`/api/admin/reflection-questions/${id}`, { method: 'PATCH', body: data });
}

export function fetchNfoDayStats() {
  return apiRequest<NfoDayStats>('/api/admin/nfo-day/stats');
}

export function fetchCheckinSettings() {
  return apiRequest<{
    enabledTracks: string[];
    slots: string[];
    intervals?: { start: string; end: string; label?: string }[];
    title?: string;
    subtitle?: string;
    emotions?: string[];
    energyLabel?: string;
    energyLowLabel?: string;
    energyMidLabel?: string;
    energyHighLabel?: string;
    emotionLabel?: string;
    commentPlaceholder?: string;
  }>('/api/admin/settings/checkin');
}

export function saveCheckinSettings(data: {
  enabledTracks: string[];
  slots: string[];
  intervals?: { start: string; end: string; label?: string }[];
  title?: string;
  subtitle?: string;
  emotions?: string[];
  energyLabel?: string;
  energyLowLabel?: string;
  energyMidLabel?: string;
  energyHighLabel?: string;
  emotionLabel?: string;
  commentPlaceholder?: string;
}) {
  return apiRequest('/api/admin/settings/checkin', { method: 'POST', body: data });
}

export function fetchExchangeSlots() {
  return apiRequest<{ slots: string[] }>('/api/admin/settings/exchange-slots');
}

export function saveExchangeSlots(slots: string[]) {
  return apiRequest('/api/admin/settings/exchange-slots', { method: 'POST', body: { slots } });
}

export function fetchActivityLogs(limit = 200) {
  return apiRequest<{ logs: ActivityLogRow[] }>(`/api/admin/activity?limit=${limit}`);
}

export function fetchExchangeActivity() {
  return apiRequest<{ activity: ExchangeActivityRow[] }>('/api/admin/exchange/activity');
}

export interface ReflectionAnswerRow {
  id: number;
  answerText: string;
  createdAt: string;
  questionText: string;
  questionType: string;
  userName: string;
  userLastName: string | null;
  track: string | null;
}

export interface NfoDayStats {
  answers: { answerText: string; factors: string[]; date: string; userName: string; track: string | null }[];
  factorCounts: Record<string, number>;
}

export interface ActivityLogRow {
  id: number;
  action: string;
  createdAt: string;
  userName: string;
  track: string | null;
}

export interface ExchangeActivityRow {
  id: number;
  text: string;
  status: string;
  answerCount: number;
  assignmentCount: number;
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
  networkingContacts?: number;
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
  taskTitle?: string;
  userName?: string;
  answerText: string | null;
  photos?: string[] | null;
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
  allowMultiple?: boolean;
}
