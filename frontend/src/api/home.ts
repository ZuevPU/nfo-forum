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
    firstAvailableTaskId: number | null;
    newExchangeAnswers: number;
    activeQuestions: number;
    activeExchange: number;
    pendingIncomingAssignments: number;
    exchangeActiveCycle: boolean;
  };
  focusOfDay: {
    id: number;
    title: string;
  } | null;
  diagnostics: {
    available: boolean;
    completedBlocks: number;
    totalBlocks: number;
    isCompleted: boolean;
  };
  checkin?: {
    available: boolean;
    activeSlot: string | null;
    slotLabel: string | null;
    canSubmit?: boolean;
    nextSlotAt?: string | null;
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

export function submitFeedback(text: string) {
  return apiRequest('/api/home/feedback', {
    method: 'POST',
    body: { text },
  });
}

export interface FeedbackReplyItem {
  id: number;
  text: string;
  createdAt: string;
  adminUserId: number;
  adminFirstName: string;
  adminLastName: string | null;
}

export interface FeedbackThreadItem {
  id: number;
  text: string;
  createdAt: string;
  userId: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  replies: FeedbackReplyItem[];
}

export function fetchFeedbackThread() {
  return apiRequest<{ messages: FeedbackThreadItem[] }>('/api/home/feedback');
}
