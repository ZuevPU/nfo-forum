import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { mediaFiles } from '../db/schema.js';
import { mediaStoragePath, resolveMediaUrl } from '../utils/mediaUrls.js';
import { parseDataUrlImage } from './upload.service.js';

const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg']);

function normalizeMime(mime: string): string {
  return mime.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mime.toLowerCase();
}

export async function getMedia(id: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const [row] = await db
    .select({
      data: mediaFiles.data,
      mimeType: mediaFiles.mimeType,
    })
    .from(mediaFiles)
    .where(eq(mediaFiles.id, id))
    .limit(1);

  if (!row) return null;
  return { buffer: row.data, mimeType: row.mimeType };
}

async function insertMedia(
  buffer: Buffer,
  mimeType: string,
  source: string,
): Promise<{ id: string; url: string; path: string }> {
  const id = randomUUID();
  await db.insert(mediaFiles).values({
    id,
    mimeType,
    data: buffer,
    sizeBytes: buffer.length,
    source,
  });
  return { id, url: resolveMediaUrl(id), path: mediaStoragePath(id) };
}

export async function saveFromDataUrl(
  dataUrl: string,
  source = 'upload',
): Promise<{ id: string; url: string; path: string }> {
  const { buffer, ext } = parseDataUrlImage(dataUrl);
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  return insertMedia(buffer, mimeType, source);
}

export async function saveFromUrl(url: string): Promise<{ id: string; url: string; path: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NFO-Forum-Bot/1.0' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }
    const contentType = normalizeMime(response.headers.get('content-type')?.split(';')[0]?.trim() ?? '');
    if (!ALLOWED_MIME.has(contentType)) {
      throw new Error('Only jpg and png images are allowed');
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > MAX_BYTES) {
      throw new Error('Photo exceeds 10 MB limit');
    }
    if (buffer.length === 0) {
      throw new Error('Empty image');
    }
    return insertMedia(buffer, contentType === 'image/jpg' ? 'image/jpeg' : contentType, 'url');
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveMediaIdFromImageInput(
  image?: string | null,
  imageMediaId?: string | null,
): Promise<string | null> {
  if (imageMediaId) return imageMediaId;
  if (!image?.trim()) return null;

  const trimmed = image.trim();
  if (trimmed.startsWith('data:')) {
    const saved = await saveFromDataUrl(trimmed, 'upload');
    return saved.id;
  }

  const mediaPathMatch = /\/api\/media\/([0-9a-f-]{36})/i.exec(trimmed);
  if (mediaPathMatch) {
    return mediaPathMatch[1];
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const saved = await saveFromUrl(trimmed);
    return saved.id;
  }

  return null;
}
