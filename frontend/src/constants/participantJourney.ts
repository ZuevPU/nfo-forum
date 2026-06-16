export type JourneyStatus = 'active' | 'silent';

export interface JourneyTag {
  label: string;
  variant: 'blue' | 'green' | 'orange' | 'gray';
}

export interface JourneyItem {
  time: string;
  emoji: string;
  iconClass: string;
  title: string;
  status: JourneyStatus;
  description: string;
  tags?: JourneyTag[];
  isLast?: boolean;
}

export const PARTICIPANT_JOURNEY: JourneyItem[] = [
  {
    time: '8:00',
    emoji: '☀️',
    iconClass: 'ic-morning',
    title: 'Утреннее приветствие + фокус дня',
    status: 'active',
    description: 'Пожелание хорошего дня, краткая интрига про фокус дня. Следом — предложение посмотреть программу своего трека.',
    tags: [
      { label: 'push-уведомление', variant: 'blue' },
      { label: 'программа дня', variant: 'green' },
      { label: 'фокус дня', variant: 'orange' },
    ],
  },
  {
    time: '8:30',
    emoji: '🩷',
    iconClass: 'ic-check',
    title: 'Утренний чек-ин состояния',
    status: 'active',
    description: 'Опрос на 30 секунд: эмодзи-шкала энергии (😴→🚀) + выбор настроения из тегов.',
    tags: [
      { label: 'опрос', variant: 'blue' },
      { label: 'шкала энергии', variant: 'blue' },
      { label: 'настроение', variant: 'blue' },
    ],
  },
  {
    time: '9:00',
    emoji: '⭐',
    iconClass: 'ic-task',
    title: 'Задания дня + фокус дня',
    status: 'active',
    description: 'Список активных заданий на день. Плюс «фокус дня» — одна смысловая рамка для наблюдений.',
    tags: [
      { label: 'задания', variant: 'green' },
      { label: 'фокус дня', variant: 'orange' },
    ],
  },
  {
    time: '9:00–13:00',
    emoji: '🤓',
    iconClass: 'ic-work',
    title: 'Работа по программе — утренние блоки',
    status: 'silent',
    description: 'Участник на сессиях. Бот не мешает. Исключение: может прийти вопрос от другого участника или напоминание об активном задании.',
    tags: [
      { label: 'вопрос от участника — возможен', variant: 'gray' },
      { label: 'напоминание о задании — возможно', variant: 'gray' },
    ],
  },
  {
    time: '~13:00',
    emoji: '🔍',
    iconClass: 'ic-lunch',
    title: 'Дневной чек-ин состояния',
    status: 'active',
    description: 'Шкала настроения (😩→🤩) + открытый вопрос: «С чем связано твоё состояние?»',
    tags: [
      { label: 'шкала состояния', variant: 'blue' },
      { label: 'текстовый комментарий', variant: 'blue' },
    ],
  },
  {
    time: '13:00–14:00',
    emoji: '🍽️',
    iconClass: 'ic-rec',
    title: 'Обед',
    status: 'silent',
    description: 'Участник отдыхает. Бот не тревожит.',
  },
  {
    time: '14:00–19:00',
    emoji: '🤓',
    iconClass: 'ic-work',
    title: 'Работа по программе — дневные блоки',
    status: 'silent',
    description: 'Участник на сессиях. Бот не мешает. Исключение: вопрос от участника или напоминание об активном задании.',
    tags: [
      { label: 'вопрос от участника — возможен', variant: 'gray' },
      { label: 'напоминание о задании — возможно', variant: 'gray' },
    ],
  },
  {
    time: '19:00',
    emoji: '🌅',
    iconClass: 'ic-eve',
    title: 'Вечерний чек-ин состояния',
    status: 'active',
    description: 'Та же шкала настроения + открытый вопрос о состоянии. Параллельно — напоминание о незакрытых заданиях дня.',
    tags: [
      { label: 'шкала состояния', variant: 'blue' },
      { label: 'текстовый комментарий', variant: 'blue' },
      { label: 'незакрытые задания', variant: 'orange' },
    ],
  },
  {
    time: '21:00',
    emoji: '✨',
    iconClass: 'ic-ref',
    title: 'Вечерняя рефлексия + вопрос про НФО',
    status: 'active',
    description: 'Три рефлексивных вопроса и один открытый: «Что для тебя сегодня — неформальное образование, и почему?»',
    tags: [
      { label: '3 вопроса рефлексии', variant: 'blue' },
      { label: 'вопрос про НФО', variant: 'orange' },
      { label: 'открытый ответ', variant: 'green' },
    ],
  },
  {
    time: '23:00',
    emoji: '🌙',
    iconClass: 'ic-night',
    title: 'Пожелание спокойной ночи',
    status: 'active',
    description: 'Короткое тёплое сообщение. Благодарность за день. Напоминание: «Отдых — тоже часть обучения».',
    tags: [{ label: 'завершение дня', variant: 'blue' }],
    isLast: true,
  },
];
