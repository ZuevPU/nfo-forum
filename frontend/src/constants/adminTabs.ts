export type AdminTab =
  | 'events'
  | 'tasks'
  | 'exchange'
  | 'submissions'
  | 'reflection'
  | 'push'
  | 'diagnostics'
  | 'users'
  | 'feedback'
  | 'reflection-answers'
  | 'nfo-stats'
  | 'activity'
  | 'analytics-dashboard'
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
      { id: 'reflection', label: 'Вопросы' },
    ],
  },
  {
    label: 'Модерация',
    tabs: [
      { id: 'exchange', label: 'Обмен' },
      { id: 'submissions', label: 'Ответы' },
    ],
  },
  {
    label: 'Коммуникации',
    tabs: [
      { id: 'push', label: 'Push' },
      { id: 'feedback', label: 'Inbox' },
    ],
  },
  {
    label: 'Аналитика',
    tabs: [
      { id: 'diagnostics', label: 'Диагностика' },
      { id: 'reflection-answers', label: 'Рефл. ответы' },
      { id: 'nfo-stats', label: 'НФО день' },
      { id: 'activity', label: 'Активность' },
      { id: 'analytics-dashboard', label: 'Дашборд' },
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
