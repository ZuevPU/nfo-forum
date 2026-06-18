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
  /** null в override снимает лимит по количеству начислений (остаётся только maxTotal) */
  maxCount?: number | null;
};

export type PointsConfigValue = {
  rules: Record<string, PointRuleOverride>;
};

export const DEFAULT_POINT_RULES: PointActionRule[] = [
  { id: 'entry_question', label: 'Входной вопрос', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Один раз, 18 июня при открытии программы' },
  { id: 'diagnostics_complete_entry', label: 'Самодиагностика (вход)', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Один раз, 18 июня' },
  { id: 'diagnostics_profile_comment', label: 'Комментарий после самодиагностики (вход)', section: 'reflection', pointsPerAction: 5, maxTotal: 5, maxCount: 1, countsToReflection: true, optional: true, note: 'Необязательный, 18 июня' },
  { id: 'checkin_emotion', label: 'Чек-ин — эмоция', section: 'reflection', pointsPerAction: 2, maxTotal: 18, maxCount: 9, countsToReflection: true, note: '9 слотов за форум' },
  { id: 'checkin_energy', label: 'Чек-ин — энергия', section: 'reflection', pointsPerAction: 2, maxTotal: 18, maxCount: 9, countsToReflection: true, note: 'Начисляется при заполнении шкалы 0–10' },
  { id: 'checkin_comment', label: 'Чек-ин — комментарий', section: 'reflection', pointsPerAction: 3, maxTotal: 27, maxCount: 9, countsToReflection: true, optional: true, note: 'Необязательный, только если написан' },
  { id: 'reflection_answer', label: 'Рефлексивный вопрос (общий)', section: 'reflection', pointsPerAction: 10, maxTotal: 999, countsToReflection: true, note: 'Баллы задаются в вопросе' },
  { id: 'nfo_thesis', label: 'NFO — главный тезис дня', section: 'reflection', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: true, note: 'Каждый вечер 18, 19, 20 июня' },
  { id: 'nfo_understanding', label: 'NFO — как изменилось понимание', section: 'reflection', pointsPerAction: 10, maxTotal: 30, maxCount: 3, countsToReflection: true, note: 'Свободный текст, каждый вечер' },
  { id: 'nfo_factors', label: 'NFO — что повлияло', section: 'reflection', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: true, note: 'Мультивыбор до 3 факторов, каждый вечер' },
  { id: 'nfo_extra', label: 'NFO — комментарий', section: 'reflection', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: true, optional: true, note: 'Необязательный, каждый вечер' },
  { id: 'program_summary', label: 'Итоги программы', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Один раз, 20 июня' },
  { id: 'program_main_thought', label: 'Главная мысль всей программы', section: 'reflection', pointsPerAction: 7, maxTotal: 7, maxCount: 1, countsToReflection: true, note: 'Один раз, 20 июня; groupId: program-main-thought' },
  { id: 'insight', label: 'Озарение / важная мысль', section: 'reflection', pointsPerAction: 3, maxTotal: 30, countsToReflection: true, optional: true, note: 'Записи без ограничения; баллы до макс. суммы' },
  { id: 'exit_question', label: 'Выходной вопрос', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Один раз, 20 июня' },
  { id: 'diagnostics_complete_exit', label: 'Самодиагностика (выход)', section: 'reflection', pointsPerAction: 10, maxTotal: 10, maxCount: 1, countsToReflection: true, note: 'Один раз, 21 июня' },
  { id: 'diagnostics_profile_comment_exit', label: 'Комментарий после самодиагностики (выход)', section: 'reflection', pointsPerAction: 5, maxTotal: 5, maxCount: 1, countsToReflection: true, optional: true, note: 'Необязательный, 21 июня' },
  { id: 'exchange_question', label: 'Задать вопрос в «Обмене опытом»', section: 'exchange', pointsPerAction: 3, maxTotal: 30, countsToReflection: true, note: 'Без лимита попыток; баллы до макс. суммы' },
  { id: 'exchange_answer', label: 'Ответить на чужой вопрос', section: 'exchange', pointsPerAction: 3, maxTotal: 45, countsToReflection: true, note: 'Без лимита попыток; баллы до макс. суммы' },
  { id: 'task_puzzle', label: 'Знакомство — пазл', section: 'tasks', pointsPerAction: 10, maxTotal: 10, countsToReflection: false, note: '18–19 июня; справочно — баллы в задании' },
  { id: 'task_meme', label: 'Форумный мемогенератор', section: 'tasks', pointsPerAction: 7, maxTotal: 35, countsToReflection: false, note: 'Макс. 5 мемов' },
  { id: 'task_infinite_nfo', label: 'Бесконечное НФО', section: 'tasks', pointsPerAction: 5, maxTotal: 5, countsToReflection: false, note: 'Фото стенда' },
  { id: 'task_what_next', label: 'Что было дальше?', section: 'tasks', pointsPerAction: 10, maxTotal: 10, countsToReflection: false, note: '19–20 июня' },
  { id: 'task_sea_mountains_submit', label: 'Море или горы — дилемма', section: 'tasks', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: false },
  { id: 'task_sea_mountains_vote', label: 'Море или горы — голосование', section: 'tasks', pointsPerAction: 3, maxTotal: 15, maxCount: 5, countsToReflection: false },
  { id: 'task_dream', label: 'Мечта об НФО', section: 'tasks', pointsPerAction: 10, maxTotal: 10, countsToReflection: false, note: '20–21 июня' },
  { id: 'task_networking_lunch', label: 'Нетворкинг-обед', section: 'tasks', pointsPerAction: 5, maxTotal: 10, maxCount: 2, countsToReflection: false, note: '19 и 20 июня, по 5 б. за обед' },
  { id: 'task_sketches', label: 'Зарисовки', section: 'tasks', pointsPerAction: 10, maxTotal: 10, countsToReflection: false, note: '20–21 июня' },
  { id: 'task_handshakes', label: 'Теория шести рукопожатий', section: 'tasks', pointsPerAction: 15, maxTotal: 15, countsToReflection: false, note: '20–21 июня' },
  { id: 'task_humanity', label: 'Операция «Человечность»', section: 'tasks', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: false, note: 'До обеда 19 июня, 3 раза' },
  { id: 'task_travel_collage', label: 'Коллаж путешествия', section: 'tasks', pointsPerAction: 15, maxTotal: 15, maxCount: 1, countsToReflection: false, note: 'До вечера 20 июня' },
  { id: 'task_observations', label: 'Коллекция наблюдений', section: 'tasks', pointsPerAction: 5, maxTotal: 15, maxCount: 3, countsToReflection: false, note: 'До обеда 19 июня, 3 раза' },
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
    maxCount: 'maxCount' in o ? (o.maxCount ?? undefined) : base.maxCount,
  };
}

export function resolveReflectionActionId(type: string, groupId?: string | null): string {
  if (type === 'entry') return 'entry_question';
  if (type === 'final') return 'exit_question';
  if (type === 'insight' || groupId === 'program-insights') return 'insight';
  if (groupId === 'program-summary') return 'program_summary';
  if (groupId === 'program-main-thought') return 'program_main_thought';
  return 'reflection_answer';
}

/** Sum of maxTotal per section (excludes reflection_answer placeholder). */
export function sectionMaxTotals(): Record<PointSection, number> {
  const totals: Record<PointSection, number> = { reflection: 0, exchange: 0, tasks: 0 };
  for (const rule of DEFAULT_POINT_RULES) {
    if (rule.id === 'reflection_answer') continue;
    totals[rule.section] += rule.maxTotal;
  }
  return totals;
}
