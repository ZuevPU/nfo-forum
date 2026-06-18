import { apiRequest } from './client';

export function formatExchangeAuthorName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Участник';
}

export function formatExchangeAuthorTrack(track?: string | null): string | null {
  return track ? `Трек «${track}»` : null;
}

export function fetchExchangeFeed(scope: 'all' | 'track' = 'all') {
  return apiRequest<{ feed: ExchangeFeedItem[] }>(`/api/exchange/feed?scope=${scope}`);
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

export function deferExchangeQuestion(assignmentId: number) {
  return apiRequest(`/api/exchange/assignments/${assignmentId}/defer`, { method: 'POST' });
}

export function fetchQuestionDetail(id: number) {
  return apiRequest<QuestionDetail>(`/api/exchange/questions/${id}`);
}

export function addReaction(answerId: number, reactionType: string = 'like') {
  return apiRequest('/api/exchange/reactions', {
    method: 'POST',
    body: { answer_id: answerId, reaction_type: reactionType },
  });
}

export function reportExchangeAnswer(answerId: number) {
  return apiRequest('/api/exchange/reports', {
    method: 'POST',
    body: { answer_id: answerId },
  });
}

export interface ExchangeFeedItem {
  id: number;
  text: string;
  scope: string;
  scopeLabel: string;
  authorFirstName?: string;
  authorLastName?: string | null;
  authorTrack?: string | null;
  answerCount: number;
  isMine: boolean;
  createdAt: string;
}

export interface IncomingQuestion {
  assignmentId: number;
  questionId: number;
  text: string;
  status: string;
  authorFirstName?: string;
  authorLastName?: string | null;
  authorTrack?: string | null;
}

export interface QuestionDetail {
  question: {
    id: number;
    text: string;
    isMine: boolean;
    scope?: string;
    scopeLabel?: string;
    authorFirstName?: string;
    authorLastName?: string | null;
    authorTrack?: string | null;
    publishTime?: string;
  };
  answers: {
    id: number;
    answerText: string;
    isMine: boolean;
    createdAt: string;
    authorFirstName?: string;
    authorLastName?: string | null;
    authorTrack?: string | null;
    likeCount: number;
    discussCount: number;
    likedByMe: boolean;
    discussedByMe: boolean;
  }[];
}
