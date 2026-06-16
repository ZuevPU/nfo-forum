const MSK = 'Europe/Moscow';

export function nowMoscow(): Date {
  return new Date();
}

export function moscowDateString(date = new Date()): string {
  return date.toLocaleDateString('sv-SE', { timeZone: MSK });
}

export function moscowTimeParts(date = new Date()): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MSK,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return {
    hours: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minutes: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
  };
}

export function isEventNow(startTime: Date, endTime: Date, now = new Date()): boolean {
  return startTime <= now && endTime >= now;
}

export const FORUM_DAYS = [
  { key: '2026-06-18', label: 'Чт 18.06' },
  { key: '2026-06-19', label: 'Пт 19.06' },
  { key: '2026-06-20', label: 'Сб 20.06' },
  { key: '2026-06-21', label: 'Вс 21.06' },
] as const;

export function moscowDayBounds(dayKey: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dayKey}T00:00:00+03:00`),
    end: new Date(`${dayKey}T23:59:59.999+03:00`),
  };
}

export function programDayFromMsk(date = new Date()): number | null {
  const mskDate = moscowDateString(date);
  const idx = FORUM_DAYS.findIndex((d) => d.key === mskDate);
  return idx >= 0 ? idx + 1 : null;
}

export function formatMoscowDate(date = new Date()): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: MSK,
  }).format(date);
}
