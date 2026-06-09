import type { EventDto } from './home';
import { apiRequest } from './client';

export function fetchEvents(track = 'all', day?: string): Promise<{ events: EventDto[] }> {
  const params = new URLSearchParams({ track });
  if (day) params.set('day', day);
  return apiRequest(`/api/events?${params}`);
}

export function fetchCurrentEvent(): Promise<{ event: EventDto | null }> {
  return apiRequest('/api/events/current');
}
