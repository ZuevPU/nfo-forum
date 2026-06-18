/** groupId reflection_questions, скрывается из «Вопросов программы» — блок «Озарения» отдельно */
export const INSIGHTS_QUESTION_GROUP_ID = 'program-insights';

export type InsightsSettings = {
  prompt: string;
  placeholder: string;
};

export const DEFAULT_INSIGHTS_SETTINGS: InsightsSettings = {
  prompt: 'Зафиксируй озарение или важную мысль по ходу программы.',
  placeholder: 'Что важного понял(а) или заметил(а)...',
};
