import { apiRequest } from './client';

export function fetchDiagnosticBlocks() {
  return apiRequest<{ blocks: DiagnosticBlock[] }>('/api/diagnostics/blocks');
}

export function submitDiagnosticAnswer(blockId: number, questionId: number, score: number) {
  return apiRequest('/api/diagnostics/answers', {
    method: 'POST',
    body: { block_id: blockId, question_id: questionId, score },
  });
}

export function fetchDiagnosticProgress() {
  return apiRequest('/api/diagnostics/progress');
}

export interface DiagnosticBlock {
  id: number;
  title: string;
  questions: { id: number; text: string }[];
}
