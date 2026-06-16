import { FORUM_DAYS } from '../constants/nfoFactors';

const CACHE_PREFIX = 'nfo_schedule_';

export function cacheEvents(track: string, day: string, events: unknown[]) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${track}_${day}`, JSON.stringify({ events, cachedAt: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

export function getCachedEvents<T>(track: string, day: string): T[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${track}_${day}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { events: T[] };
    return parsed.events ?? null;
  } catch {
    return null;
  }
}

export function getDefaultForumDay(): string {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
  const found = FORUM_DAYS.find((d) => d.key === today);
  return found?.key ?? FORUM_DAYS[0].key;
}

export function isEventNowMoscow(startIso: string, endIso: string): boolean {
  const now = Date.now();
  return new Date(startIso).getTime() <= now && new Date(endIso).getTime() >= now;
}

export function formatEventTimeMoscow(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  });
}
