import { env } from '../config/env.js';

const MEDIA_ID_IN_PATH = /\/api\/media\/([0-9a-f-]{36})/i;
const UUID_ONLY = /^[0-9a-f-]{36}$/i;

export function extractMediaId(stored: string): string | null {
  const trimmed = stored.trim();
  const fromPath = MEDIA_ID_IN_PATH.exec(trimmed);
  if (fromPath) return fromPath[1];
  if (UUID_ONLY.test(trimmed)) return trimmed;
  return null;
}

export function mediaStoragePath(id: string): string {
  return `/api/media/${id}`;
}

/** Absolute URL for the current API host (works in admin and exports). */
export function resolvePhotoUrl(stored: string, baseUrl = env.API_PUBLIC_URL): string {
  const id = extractMediaId(stored);
  if (id) {
    const base = baseUrl.replace(/\/$/, '');
    return `${base}/api/media/${id}`;
  }
  if (stored.startsWith('data:') || /^https?:\/\//i.test(stored)) {
    return stored;
  }
  if (stored.startsWith('/api/media/')) {
    const base = baseUrl.replace(/\/$/, '');
    return `${base}${stored}`;
  }
  return stored;
}

export function normalizePhotoUrls(photos: string[] | null | undefined): string[] | null {
  if (!photos?.length) return photos ?? null;
  return photos.map((p) => resolvePhotoUrl(p));
}

/** Full public URL for a newly uploaded media id. */
export function resolveMediaUrl(id: string, baseUrl = env.API_PUBLIC_URL): string {
  return resolvePhotoUrl(mediaStoragePath(id), baseUrl);
}
