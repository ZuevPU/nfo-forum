import { apiRequest } from './client';

export function submitCheckin(emotion: string, energyLevel: number, comment?: string) {
  return apiRequest<CheckinResult>('/api/state/checkin', {
    method: 'POST',
    body: { emotion, energy_level: energyLevel, comment },
  });
}

export function fetchTodayCheckins() {
  return apiRequest<{ checkins: Checkin[] }>('/api/state/today');
}

export function fetchCheckinHistory() {
  return apiRequest<{ checkins: Checkin[] }>('/api/state/history');
}

export interface Checkin {
  id: number;
  emotion: string;
  energyLevel: number;
  comment: string | null;
  createdAt: string;
}

export interface CheckinResult {
  checkin: Checkin;
  botReaction: string;
}
