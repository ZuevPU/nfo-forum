import { apiRequest } from './client';

export interface DilemmaItem {
  id: number;
  text: string;
  optionA: string;
  optionB: string;
  pointsPerVote: number;
  status: 'new' | 'answered' | 'soon';
  myChoice: 'a' | 'b' | null;
  myComment: string | null;
  publishedAt: string;
}

export interface DilemmaDetail {
  id: number;
  text: string;
  optionA: string;
  optionB: string;
  pointsPerVote: number;
  myChoice: 'a' | 'b' | null;
  myComment: string | null;
  results: { total: number; percentA: number; percentB: number } | null;
}

export interface DilemmasSummary {
  answeredCount: number;
  totalCount: number;
  maxPoints: number;
  status: 'active' | 'completed';
}

export interface AdminDilemma {
  id: number;
  text: string;
  optionA: string;
  optionB: string;
  publishedAt: string;
  isPublished: boolean;
  pointsPerVote: number;
  votesTotal: number;
  percentA: number;
  percentB: number;
}

export function fetchDilemmasSummary() {
  return apiRequest<DilemmasSummary>('/api/dilemmas/summary');
}

export function fetchDilemmas() {
  return apiRequest<{ dilemmas: DilemmaItem[] }>('/api/dilemmas');
}

export function fetchDilemmaDetail(id: number) {
  return apiRequest<DilemmaDetail>(`/api/dilemmas/${id}`);
}

export function voteDilemma(id: number, chosenOption: 'a' | 'b', comment?: string) {
  return apiRequest<{ vote: unknown }>(`/api/dilemmas/${id}/vote`, {
    method: 'POST',
    body: { chosen_option: chosenOption, comment },
  });
}

export function fetchAdminDilemmas() {
  return apiRequest<{ dilemmas: AdminDilemma[] }>('/api/dilemmas/admin/all');
}

export function createAdminDilemma(data: {
  text: string;
  optionA: string;
  optionB: string;
  publishedAt: string;
  pointsPerVote?: number;
}) {
  return apiRequest<{ dilemma: AdminDilemma }>('/api/dilemmas/admin/create', {
    method: 'POST',
    body: data,
  });
}

export function updateAdminDilemma(
  id: number,
  data: Partial<{ text: string; optionA: string; optionB: string; publishedAt: string; pointsPerVote: number }>,
) {
  return apiRequest<{ dilemma: AdminDilemma }>(`/api/dilemmas/admin/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export function deleteAdminDilemma(id: number) {
  return apiRequest<{ ok: boolean }>(`/api/dilemmas/admin/${id}`, { method: 'DELETE' });
}
