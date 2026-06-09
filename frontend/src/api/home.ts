import type { UserDto } from '../types/auth';
import { apiRequest } from './client';

export interface HomeData {
  user: UserDto;
  currentEvent: EventDto | null;
  upcomingBlock: EventDto | null;
  trackRank: number;
  stats: {
    tasksAvailable: number;
    tasksCompleted: number;
    newExchangeAnswers: number;
  };
}

export interface EventDto {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  place: string | null;
  track: string | null;
  isKeyBlock: boolean;
}

export function fetchHome(): Promise<HomeData> {
  return apiRequest<HomeData>('/api/home');
}
