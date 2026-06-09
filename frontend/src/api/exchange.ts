import { apiRequest } from './client';

export function fetchExchangeFeed() {
  return apiRequest<{ feed: ExchangeFeedItem[] }>('/api/exchange/feed');
}

export function createExchangeQuestion(text: string, scope: 'all' | 'track') {
  return apiRequest('/api/exchange/questions', {
    method: 'POST',
    body: { text, scope },
  });
}

export function createExchangeAnswer(questionId: number, answerText: string) {
  return apiRequest('/api/exchange/answers', {
    method: 'POST',
    body: { question_id: questionId, answer_text: answerText },
  });
}

export function fetchIncomingQuestions() {
  return apiRequest<{ incoming: IncomingQuestion[] }>('/api/exchange/incoming');
}

export function fetchQuestionDetail(id: number) {
  return apiRequest<QuestionDetail>(`/api/exchange/questions/${id}`);
}

export interface ExchangeFeedItem {
  id: number;
  text: string;
  scope: string;
  scopeLabel: string;
  answerCount: number;
  isMine: boolean;
  createdAt: string;
}

export interface IncomingQuestion {
  assignmentId: number;
  questionId: number;
  text: string;
  status: string;
}

export interface QuestionDetail {
  question: { id: number; text: string; isMine: boolean };
  answers: { id: number; answerText: string; isMine: boolean; createdAt: string }[];
}
