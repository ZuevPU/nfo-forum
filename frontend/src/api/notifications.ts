import { apiRequest } from './client';

export interface NotificationItem {
  id: number;
  text: string;
  category: string | null;
  linkHash: string | null;
  linkLabel: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsFeed {
  items: NotificationItem[];
  unreadCount: number;
}

export function fetchNotifications(): Promise<NotificationsFeed> {
  return apiRequest<NotificationsFeed>('/api/notifications');
}

export function fetchUnreadCount(): Promise<{ count: number }> {
  return apiRequest<{ count: number }>('/api/notifications/unread-count');
}

export function markNotificationRead(id: number): Promise<{ ok: boolean }> {
  return apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return apiRequest('/api/notifications/read-all', { method: 'POST' });
}
