const MEDIA_ID_IN_PATH = /\/api\/media\/([0-9a-f-]{36})/i;
const UUID_ONLY = /^[0-9a-f-]{36}$/i;

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function extractMediaId(stored: string): string | null {
  const trimmed = stored.trim();
  const fromPath = MEDIA_ID_IN_PATH.exec(trimmed);
  if (fromPath) return fromPath[1];
  if (UUID_ONLY.test(trimmed)) return trimmed;
  return null;
}

/** Display / open URL for a stored photo reference (path, uuid, or legacy localhost URL). */
export function resolvePhotoUrl(stored: string): string {
  const id = extractMediaId(stored);
  if (id && API_BASE) return `${API_BASE}/api/media/${id}`;
  if (stored.startsWith('/api/media/') && API_BASE) return `${API_BASE}${stored}`;
  if (stored.startsWith('data:') || /^https?:\/\//i.test(stored)) return stored;
  return stored;
}
