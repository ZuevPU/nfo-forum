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
