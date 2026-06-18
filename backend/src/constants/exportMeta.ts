import { moscowDateString } from '../utils/moscowTime.js';

export type ExportType =
  | 'reflection'
  | 'tasks'
  | 'exchange'
  | 'rating'
  | 'checkins'
  | 'nfo-day'
  | 'feedback'
  | 'points-history'
  | 'activity'
  | 'diagnostics';

export interface ExportMetaEntry {
  label: string;
  csvFilename: string;
  xlsxFilename: string;
  sheetName: string;
}

export const EXPORT_META: Record<ExportType, ExportMetaEntry> = {
  reflection: {
    label: 'Рефлексия',
    csvFilename: 'Рефлексия.csv',
    xlsxFilename: 'Рефлексия.xlsx',
    sheetName: 'Рефлексия',
  },
  tasks: {
    label: 'Задания',
    csvFilename: 'Задания.csv',
    xlsxFilename: 'Задания.xlsx',
    sheetName: 'Задания',
  },
  exchange: {
    label: 'Обмен опытом',
    csvFilename: 'Обмен опытом.csv',
    xlsxFilename: 'Обмен опытом.xlsx',
    sheetName: 'Обмен опытом',
  },
  rating: {
    label: 'Рейтинг',
    csvFilename: 'Рейтинг.csv',
    xlsxFilename: 'Рейтинг.xlsx',
    sheetName: 'Рейтинг',
  },
  checkins: {
    label: 'Чек-ины',
    csvFilename: 'Чек-ины.csv',
    xlsxFilename: 'Чек-ины.xlsx',
    sheetName: 'Чек-ины',
  },
  'nfo-day': {
    label: 'Вечерняя рефлексия НФО',
    csvFilename: 'Вечерняя рефлексия НФО.csv',
    xlsxFilename: 'Вечерняя рефлексия НФО.xlsx',
    sheetName: 'Вечерняя рефлексия НФО',
  },
  feedback: {
    label: 'Обратная связь',
    csvFilename: 'Обратная связь.csv',
    xlsxFilename: 'Обратная связь.xlsx',
    sheetName: 'Обратная связь',
  },
  'points-history': {
    label: 'История баллов',
    csvFilename: 'История баллов.csv',
    xlsxFilename: 'История баллов.xlsx',
    sheetName: 'История баллов',
  },
  activity: {
    label: 'Активность',
    csvFilename: 'Активность.csv',
    xlsxFilename: 'Активность.xlsx',
    sheetName: 'Активность',
  },
  diagnostics: {
    label: 'Диагностика',
    csvFilename: 'Диагностика.csv',
    xlsxFilename: 'Диагностика.xlsx',
    sheetName: 'Диагностика',
  },
};

export function getMainReportFilename(date = new Date()): string {
  return `Выгрузки_Форум_НФО_${moscowDateString(date)}.xlsx`;
}

export function getExportMeta(type: string): ExportMetaEntry | null {
  return EXPORT_META[type as ExportType] ?? null;
}

export function contentDispositionAttachment(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Frontend mirror of export labels (keep in sync with EXPORT_META). */
export const ADMIN_EXPORT_TYPES: ExportType[] = [
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

export const ADMIN_EXPORT_LABELS: Record<ExportType, string> = Object.fromEntries(
  Object.entries(EXPORT_META).map(([k, v]) => [k, v.label]),
) as Record<ExportType, string>;

export const ADMIN_EXPORT_FILENAMES: Record<ExportType, { csv: string; xlsx: string }> = Object.fromEntries(
  Object.entries(EXPORT_META).map(([k, v]) => [k, { csv: v.csvFilename, xlsx: v.xlsxFilename }]),
) as Record<ExportType, { csv: string; xlsx: string }>;
