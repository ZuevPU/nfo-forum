export type AdminTab =
  | 'events'
  | 'tasks'
  | 'dilemmas'
  | 'exchange'
  | 'submissions'
  | 'reflection'
  | 'networking-lunch'
  | 'push'
  | 'diagnostics'
  | 'users'
  | 'feedback'
  | 'reflection-answers'
  | 'nfo-stats'
  | 'activity'
  | 'settings';

export interface AdminTabItem {
  id: AdminTab;
  label: string;
}

export interface AdminTabGroup {
  label: string;
  tabs: AdminTabItem[];
}

export const ADMIN_TAB_GROUPS: AdminTabGroup[] = [
  {
    label: 'Контент',
    tabs: [
      { id: 'events', label: 'События' },
      { id: 'tasks', label: 'Задания' },
      { id: 'dilemmas', label: 'Дилеммы' },
      { id: 'reflection', label: 'Вопросы' },
      { id: 'networking-lunch', label: 'Нетворкинг-обед' },
    ],
  },
  {
    label: 'Модерация',
    tabs: [
      { id: 'exchange', label: 'Обмен' },
      { id: 'submissions', label: 'Ответы на задания' },
      { id: 'feedback', label: 'Обращения' },
    ],
  },
  {
    label: 'Коммуникации',
    tabs: [{ id: 'push', label: 'Push' }],
  },
  {
    label: 'Аналитика',
    tabs: [
      { id: 'diagnostics', label: 'Диагностика' },
      { id: 'reflection-answers', label: 'Рефл. ответы' },
      { id: 'nfo-stats', label: 'НФО день' },
      { id: 'activity', label: 'Активность' },
    ],
  },
  {
    label: 'Система',
    tabs: [
      { id: 'users', label: 'Участники' },
      { id: 'settings', label: 'Настройки' },
    ],
  },
];
