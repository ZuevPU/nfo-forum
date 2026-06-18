export type AdminExportType =
  | 'reflection'
  | 'tasks'
  | 'exchange'
  | 'rating'
  | 'checkins'
  | 'nfo-day'
  | 'feedback'
  | 'points-history'
  | 'activity';

export const ADMIN_EXPORT_TYPES: AdminExportType[] = [
  'reflection',
  'tasks',
  'exchange',
  'rating',
  'checkins',
  'nfo-day',
  'feedback',
  'points-history',
  'activity',
];

export const ADMIN_EXPORT_LABELS: Record<AdminExportType, string> = {
  reflection: 'Рефлексия',
  tasks: 'Задания',
  exchange: 'Обмен опытом',
  rating: 'Рейтинг',
  checkins: 'Чек-ины',
  'nfo-day': 'Вечерняя рефлексия НФО',
  feedback: 'Обратная связь',
  'points-history': 'История баллов',
  activity: 'Активность',
};

export const ADMIN_EXPORT_FILENAMES: Record<AdminExportType, { csv: string; xlsx: string }> = {
  reflection: { csv: 'Рефлексия.csv', xlsx: 'Рефлексия.xlsx' },
  tasks: { csv: 'Задания.csv', xlsx: 'Задания.xlsx' },
  exchange: { csv: 'Обмен опытом.csv', xlsx: 'Обмен опытом.xlsx' },
  rating: { csv: 'Рейтинг.csv', xlsx: 'Рейтинг.xlsx' },
  checkins: { csv: 'Чек-ины.csv', xlsx: 'Чек-ины.xlsx' },
  'nfo-day': { csv: 'Вечерняя рефлексия НФО.csv', xlsx: 'Вечерняя рефлексия НФО.xlsx' },
  feedback: { csv: 'Обратная связь.csv', xlsx: 'Обратная связь.xlsx' },
  'points-history': { csv: 'История баллов.csv', xlsx: 'История баллов.xlsx' },
  activity: { csv: 'Активность.csv', xlsx: 'Активность.xlsx' },
};

export function getMainReportFilename(date = new Date()): string {
  const msk = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
  return `Выгрузки_Форум_НФО_${msk}.xlsx`;
}
