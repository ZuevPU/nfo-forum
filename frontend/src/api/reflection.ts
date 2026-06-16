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

export function submitNfoDayReflection(answerText: string, factors: string[]) {
  return apiRequest('/api/reflection/nfo-day', {
    method: 'POST',
    body: { answer_text: answerText, factors },
  });
}

export function fetchNfoDayToday() {
  return apiRequest('/api/reflection/nfo-day/today');
}

export interface ReflectionQuestion {
  id: number;
  text: string;
  type: string;
  groupId: string | null;
  points: number;
  isLocked: boolean;
  isAnswered: boolean;
  unlockLabel: string | null;
}

export interface EveningQuestion {
  id: number;
  text: string;
  type: string;
  points: number;
}
