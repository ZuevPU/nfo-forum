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

export function submitNfoDayReflection(answerText: string, factors: string[]) {
  return apiRequest('/api/reflection/nfo-day', {
    method: 'POST',
    body: { answer_text: answerText, factors },
  });
}

export function fetchNfoDayToday() {
  return apiRequest<{ reflection: NfoDayReflection | null }>('/api/reflection/nfo-day/today');
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
  factors: string[];
  publishHour: number;
  publishMinute: number;
  points: number;
  isOpen?: boolean;
}

export interface NfoDayReflection {
  answerText: string;
  factors: string[];
  createdAt: string;
}
