import { apiRequest } from './client';

export interface Level {
  level: number;
  label: string;
  short_description: string;
  details: string;
}

export interface Skill {
  id: number;
  title: string;
  self_assessment_question: string;
  hint: string;
  levels: Level[];
}

export interface DiagnosticData {
  title: string;
  subtitle: string;
  scale: {
    min: number;
    max: number;
    labels: Record<string, string>;
  };
  skills: Skill[];
  interpretation_key: Record<string, { label: string; meaning: string }>;
}

export interface DiagnosticAnswer {
  id: number;
  userId: number;
  blockId: number;
  score: number;
  attemptNumber: number;
  comment: string | null;
  createdAt: string;
}

export function fetchDiagnosticBlocks() {
  return apiRequest<{ blocks: DiagnosticData }>('/api/diagnostics/blocks');
}

export function submitDiagnosticAnswer(blockId: number, questionId: number, score: number, comment?: string) {
  return apiRequest('/api/diagnostics/answers', {
    method: 'POST',
    body: { block_id: blockId, question_id: questionId, score, comment },
  });
}

export function fetchDiagnosticProgress() {
  return apiRequest<{ progress: DiagnosticAnswer[] }>('/api/diagnostics/progress');
}

export function completeDiagnosticAttempt() {
  return apiRequest<{ success: boolean; attempt?: number; reason?: string }>('/api/diagnostics/complete', {
    method: 'POST',
  });
}

export function startNewDiagnosticAttempt() {
  return apiRequest<{ attempt: number }>('/api/diagnostics/start-new', {
    method: 'POST',
  });
}
