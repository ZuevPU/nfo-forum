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

export function fetchCheckinStatus() {
  return apiRequest<{ status: CheckinStatus }>('/api/state/checkin-status');
}

export interface CheckinStatus {
  available: boolean;
  canSubmit: boolean;
  activeSlot: string | null;
  slotLabel: string | null;
  nextSlotAt: string | null;
  nextSlotLabel: string | null;
  answeredInCurrentSlot: boolean;
  title?: string;
  subtitle?: string;
  emotions?: string[];
  energyLabel?: string;
  energyLowLabel?: string;
  energyMidLabel?: string;
  energyHighLabel?: string;
  emotionLabel?: string;
  commentPlaceholder?: string;
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
