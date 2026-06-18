export const NFO_DAY_FACTORS = [
  'Работа в направлении',
  'Общие образовательные блоки',
  'Выступления спикеров на направлении',
  'Работа в группе',
  'Общение с участниками',
  'Личные размышления',
  'Атмосфера программы',
  'Среда Центра',
  'Истории других участников',
  'Задания программы',
  'Культурная программа',
  'Другое',
] as const;

export const NFO_DAY_PANEL_TITLE = 'Главное по итогам дня';
export const NFO_DAY_PANEL_SUBTITLE = 'Вечерняя рефлексия';

export type NfoDayQuestionConfig = {
  id: string;
  label: string;
  type: 'text' | 'multiselect';
  required?: boolean;
  maxSelect?: number;
};

export const DEFAULT_NFO_DAY_QUESTIONS: NfoDayQuestionConfig[] = [
  { id: 'thesis', label: 'Главный тезис (вывод дня)', type: 'text', required: true },
  {
    id: 'understanding',
    label: 'Как изменилось твоё понимание / отношение к деятельности сегодня?',
    type: 'text',
    required: true,
  },
  { id: 'factors', label: 'Что больше всего повлияло?', type: 'multiselect', maxSelect: 3, required: true },
  { id: 'extra', label: 'Что ещё важно сказать по итогам дня?', type: 'text', required: false },
];

export const NFO_DAY_QUESTION = 'Каким НФО было для тебя сегодня?';

export const FORUM_DAYS = [
  { key: '2026-06-18', label: 'Чт 18.06' },
  { key: '2026-06-19', label: 'Пт 19.06' },
  { key: '2026-06-20', label: 'Сб 20.06' },
  { key: '2026-06-21', label: 'Вс 21.06' },
] as const;

export const REFLECTION_LEVEL_NAMES: Record<number, string> = {
  1: 'Начал задумываться',
  2: 'Удерживаю важное',
  3: 'Соединяю опыт',
  4: 'Вижу картину целиком',
  5: 'Строю свою траекторию',
};
