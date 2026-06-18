export type PointSection = 'reflection' | 'exchange' | 'tasks';

export type PointActionRule = {
  id: string;
  label: string;
  section: PointSection;
  pointsPerAction: number;
  maxTotal: number;
  maxCount?: number;
  countsToReflection: boolean;
  optional?: boolean;
  note?: string;
};

export type PointRuleOverride = {
  pointsPerAction?: number;
  maxTotal?: number;
  maxCount?: number;
};

export type PointsConfigValue = {
  rules: Record<string, PointRuleOverride>;
};

export const DEFAULT_POINT_RULES: PointActionRule[] = [
  { id: 'entry_question', label: 'Входной вопрос', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Один раз при открытии программы' },
  { id: 'diagnostics_complete_entry', label: 'Самодиагностика (вход)', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Первая попытка' },
  { id: 'diagnostics_profile_comment', label: 'Комментарий после самодиагностики (вход)', section: 'reflection', pointsPerAction: 5, maxTotal: 5, maxCount: 1, countsToReflection: true, optional: true, note: 'Необязательный, первая попытка' },
  { id: 'checkin_emotion', label: 'Чек-ин — эмоция', section: 'reflection', pointsPerAction: 2, maxTotal: 18, maxCount: 9, countsToReflection: true, note: '9 слотов за форум' },
  { id: 'checkin_energy', label: 'Чек-ин — энергия', section: 'reflection', pointsPerAction: 2, maxTotal: 18, maxCount: 9, countsToReflection: true },
  { id: 'checkin_comment', label: 'Чек-ин — комментарий', section: 'reflection', pointsPerAction: 3, maxTotal: 27, maxCount: 9, countsToReflection: true, optional: true, note: 'Только если написан' },
  { id: 'reflection_answer', label: 'Рефлексивный вопрос (общий)', section: 'reflection', pointsPerAction: 10, maxTotal: 999, countsToReflection: true, note: 'Баллы задаются в вопросе' },
  { id: 'nfo_thesis', label: 'NFO — главный тезис дня', section: 'reflection', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: true },
  { id: 'nfo_understanding', label: 'NFO — понимание темы', section: 'reflection', pointsPerAction: 10, maxTotal: 30, maxCount: 3, countsToReflection: true },
  { id: 'nfo_factors', label: 'NFO — что повлияло', section: 'reflection', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: true },
  { id: 'nfo_extra', label: 'NFO — комментарий', section: 'reflection', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: true, optional: true },
  { id: 'program_summary', label: 'Итоги программы', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true },
  { id: 'insight', label: 'Озарение / важная мысль', section: 'reflection', pointsPerAction: 3, maxTotal: 30, maxCount: 10, countsToReflection: true, note: 'До 10 записей' },
  { id: 'exit_question', label: 'Выходной вопрос', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true },
  { id: 'diagnostics_complete_exit', label: 'Самодиагностика (выход)', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Финальная попытка' },
  { id: 'diagnostics_profile_comment_exit', label: 'Комментарий после самодиагностики (выход)', section: 'reflection', pointsPerAction: 5, maxTotal: 5, maxCount: 1, countsToReflection: true, optional: true },
  { id: 'exchange_question', label: 'Задать вопрос в «Обмене опытом»', section: 'exchange', pointsPerAction: 3, maxTotal: 15, maxCount: 5, countsToReflection: true },
  { id: 'exchange_answer', label: 'Ответить на чужой вопрос', section: 'exchange', pointsPerAction: 3, maxTotal: 30, maxCount: 10, countsToReflection: true },
  { id: 'task_puzzle', label: 'Знакомство — пазл', section: 'tasks', pointsPerAction: 15, maxTotal: 15, countsToReflection: false, note: 'Справочно — баллы в задании' },
  { id: 'task_meme', label: 'Форумный мемогенератор', section: 'tasks', pointsPerAction: 7, maxTotal: 35, countsToReflection: false, note: 'Макс. 5 мемов' },
  { id: 'task_infinite_nfo', label: 'Бесконечное НФО', section: 'tasks', pointsPerAction: 5, maxTotal: 20, countsToReflection: false },
  { id: 'task_what_next', label: 'Что было дальше?', section: 'tasks', pointsPerAction: 30, maxTotal: 30, countsToReflection: false },
  { id: 'task_sea_mountains_submit', label: 'Море или горы — дилемма', section: 'tasks', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: false },
  { id: 'task_sea_mountains_vote', label: 'Море или горы — голосование', section: 'tasks', pointsPerAction: 3, maxTotal: 15, maxCount: 5, countsToReflection: false },
  { id: 'task_dream', label: 'Мечта об НФО', section: 'tasks', pointsPerAction: 15, maxTotal: 15, countsToReflection: false },
  { id: 'task_networking_lunch', label: 'Нетворкинг-обед', section: 'tasks', pointsPerAction: 10, maxTotal: 20, maxCount: 2, countsToReflection: false },
  { id: 'task_sketches', label: 'Зарисовки', section: 'tasks', pointsPerAction: 15, maxTotal: 30, countsToReflection: false },
];

export const DEFAULT_POINTS_CONFIG: PointsConfigValue = { rules: {} };

export function getDefaultRule(actionId: string): PointActionRule | undefined {
  return DEFAULT_POINT_RULES.find((r) => r.id === actionId);
}

export function mergePointRule(actionId: string, overrides?: PointRuleOverride): PointActionRule | null {
  const base = getDefaultRule(actionId);
  if (!base) return null;
  const o = overrides ?? {};
  return {
    ...base,
    pointsPerAction: o.pointsPerAction ?? base.pointsPerAction,
    maxTotal: o.maxTotal ?? base.maxTotal,
    maxCount: o.maxCount ?? base.maxCount,
  };
}

export function resolveReflectionActionId(type: string, groupId?: string | null): string {
  if (type === 'entry') return 'entry_question';
  if (type === 'final') return 'exit_question';
  if (groupId === 'program-summary') return 'program_summary';
  return 'reflection_answer';
}
