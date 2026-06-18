import { apiRequest } from './client';

export function fetchReflectionQuestions() {
  return apiRequest<{ questions: ReflectionQuestion[] }>('/api/reflection/questions');
}

export function submitReflectionAnswer(questionId: number, answerText: string) {
  return apiRequest('/api/reflection/answers', {
    method: 'POST',
    body: { question_id: questionId, answer_text: answerText },
  });
}

export function fetchEveningQuestions() {
  return apiRequest<{ questions: EveningQuestion[] }>('/api/reflection/evening');
}

export function fetchNfoDayConfig() {
  return apiRequest<NfoDayConfig>('/api/reflection/nfo-day/config');
}

export function submitNfoDayReflection(responses: {
  thesis: string;
  understanding: string;
  factors: string[];
  extra?: string;
}) {
  return apiRequest('/api/reflection/nfo-day', {
    method: 'POST',
    body: { responses },
  });
}

export function fetchNfoDayToday() {
  return apiRequest<{ reflection: NfoDayReflection | null }>('/api/reflection/nfo-day/today');
}

export function fetchProgramInsights() {
  return apiRequest<{ insights: ProgramInsight[] }>('/api/reflection/insights');
}

export function submitProgramInsight(text: string) {
  return apiRequest<{ insight: ProgramInsight; pointsAwarded: number }>('/api/reflection/insights', {
    method: 'POST',
    body: { text },
  });
}

export interface ProgramInsight {
  id: number;
  text: string;
  createdAt: string;
}

export interface ReflectionQuestion {
  id: number;
  text: string;
  type: string;
  groupId: string | null;
  points: number;
  isLocked: boolean;
  isAnswered: boolean;
  allowMultiple?: boolean;
  unlockLabel: string | null;
}

export interface EveningQuestion {
  id: number;
  text: string;
  type: string;
  points: number;
}

export interface NfoDayConfig {
  question: string;
  questions?: { id: string; label: string; type: string; required?: boolean; maxSelect?: number }[];
  factors: string[];
  publishHour: number;
  publishMinute: number;
  points: number;
  isOpen?: boolean;
  panelTitle?: string;
  panelSubtitle?: string;
}

export interface NfoDayReflection {
  answerText: string;
  factors: string[];
  responses?: Record<string, string | string[] | null> | null;
  createdAt: string;
}
