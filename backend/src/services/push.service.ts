import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { broadcasts, users } from '../db/schema.js';
import {
  DEFAULT_NOTIFICATION_PREFS,
  shouldNotify,
  type NotificationCategory,
  type NotificationPrefs,
} from '../constants/notifications.js';
import { appendAppLink } from '../utils/appLinks.js';
import { eq, inArray } from 'drizzle-orm';
import { getMedia, resolveMediaIdFromImageInput } from './media.service.js';
import { uploadPhotoForMessage } from './vkPhoto.service.js';

interface PushPayload {
  text: string;
  image?: string;
  imageMediaId?: string;
  linkHash?: string;
  targetType: 'all' | 'track' | 'user';
  targetTracks?: string[];
  targetUserId?: number;
  scheduledAt?: Date;
  category?: NotificationCategory;
  skipBroadcastLog?: boolean;
  hash?: string;
  linkLabel?: string;
}

type UserRow = {
  id: number;
  vkId: string;
  notificationsEnabled: boolean;
  messagesFromGroupAllowed: boolean;
  notificationPrefs: NotificationPrefs | null;
  track: string | null;
};

export type VkApiError = { error_code?: number; error_msg?: string };

const PEER_IDS_BATCH_SIZE = 100;

async function sendVkMessageBatch(
  vkUserIds: number[],
  message: string,
  attachment?: string,
): Promise<VkApiError | null> {
  if (!env.VK_GROUP_TOKEN) {
    const err = { error_code: 0, error_msg: 'VK_GROUP_TOKEN not set' };
    console.warn(`[push] ${err.error_msg} (group ${env.VK_GROUP_ID || 'n/a'}), skipping`);
    return err;
  }

  const peerIds = vkUserIds.join(',');

  const params = new URLSearchParams({
    peer_ids: peerIds,
    message,
    random_id: String(Math.floor(Math.random() * 1e9)),
    access_token: env.VK_GROUP_TOKEN,
    v: '5.199',
  });

  if (attachment) {
    params.set('attachment', attachment);
  }

  const response = await fetch(`https://api.vk.com/method/messages.send?${params}`, {
    method: 'POST',
  });

  const data = (await response.json()) as { error?: VkApiError; response?: number };
  if (data.error) {
    console.error(
      `[push] VK API error for ${vkUserIds.length} user(s):`,
      data.error.error_code,
      data.error.error_msg,
    );
    return data.error;
  }

  console.info(`[push] messages.send ok for ${vkUserIds.length} user(s), message_id=${data.response ?? 'n/a'}`);
  return null;
}

async function sendVkMessage(
  vkUserIds: number[],
  message: string,
  attachment?: string,
): Promise<VkApiError | null> {
  if (vkUserIds.length === 0) return null;

  let lastError: VkApiError | null = null;
  for (let i = 0; i < vkUserIds.length; i += PEER_IDS_BATCH_SIZE) {
    const batch = vkUserIds.slice(i, i + PEER_IDS_BATCH_SIZE);
    const err = await sendVkMessageBatch(batch, message, attachment);
    if (err) lastError = err;
  }
  return lastError;
}

async function resolvePhotoAttachment(payload: PushPayload): Promise<string | undefined> {
  const mediaId = payload.imageMediaId ?? (await resolveMediaIdFromImageInput(payload.image, undefined));
  if (!mediaId) return undefined;

  const media = await getMedia(mediaId);
  if (!media) return undefined;

  const ext = media.mimeType.includes('png') ? 'png' : 'jpg';
  const result = await uploadPhotoForMessage(media.buffer, `photo.${ext}`);
  if ('error' in result) {
    console.error('[push] VK photo upload failed:', result.error);
    return undefined;
  }
  return result.attachment;
}

function filterByCategory(rows: UserRow[], category?: NotificationCategory): UserRow[] {
  const withMessages = rows.filter((u) => u.messagesFromGroupAllowed);
  if (!category) return withMessages.filter((u) => u.notificationsEnabled);
  return withMessages.filter((u) =>
    shouldNotify(u.notificationsEnabled, u.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS, category),
  );
}

async function resolveTargetUsers(payload: PushPayload): Promise<UserRow[]> {
  const selectFields = {
    id: users.id,
    vkId: users.vkId,
    notificationsEnabled: users.notificationsEnabled,
    messagesFromGroupAllowed: users.messagesFromGroupAllowed,
    notificationPrefs: users.notificationPrefs,
    track: users.track,
  };

  if (payload.targetType === 'user' && payload.targetUserId) {
    const [u] = await db
      .select(selectFields)
      .from(users)
      .where(eq(users.id, payload.targetUserId))
      .limit(1);
    return u ? filterByCategory([u as UserRow], payload.category) : [];
  }

  if (payload.targetType === 'track' && payload.targetTracks?.length) {
    const rows = await db
      .select(selectFields)
      .from(users)
      .where(inArray(users.track, payload.targetTracks));
    return filterByCategory(rows as UserRow[], payload.category);
  }

  const rows = await db.select(selectFields).from(users);
  return filterByCategory(rows as UserRow[], payload.category);
}

function buildMessage(payload: PushPayload): string {
  const hash = payload.linkHash ?? payload.hash;
  if (hash) {
    return appendAppLink(payload.text, hash, payload.linkLabel);
  }
  return payload.text;
}

export async function deliverPush(
  payload: PushPayload,
): Promise<{ sent: number; vkError?: VkApiError | null }> {
  const targetUsers = await resolveTargetUsers(payload);
  const vkIds = targetUsers.map((u) => Number(u.vkId)).filter((id) => !isNaN(id));
  if (vkIds.length === 0) {
    console.info('[push] No eligible recipients for target', payload.targetType);
    return { sent: 0 };
  }

  const message = buildMessage(payload);
  const attachment = await resolvePhotoAttachment(payload);
  const vkError = await sendVkMessage(vkIds, message, attachment);
  return { sent: vkError ? 0 : vkIds.length, vkError };
}

export async function sendPush(
  payload: PushPayload,
): Promise<{ sent: number; scheduled?: boolean; vkError?: VkApiError | null }> {
  const resolvedMediaId = payload.image || payload.imageMediaId
    ? await resolveMediaIdFromImageInput(payload.image, payload.imageMediaId)
    : null;

  if (!payload.skipBroadcastLog) {
    await db.insert(broadcasts).values({
      text: payload.text,
      image: payload.image ?? null,
      imageMediaId: resolvedMediaId,
      linkHash: payload.linkHash ?? payload.hash?.replace(/^#\/?/, '') ?? null,
      targetType: payload.targetType,
      targetTracks: payload.targetTracks ?? null,
      targetUserId: payload.targetUserId ?? null,
      scheduledAt: payload.scheduledAt ?? null,
      sentAt: payload.scheduledAt && payload.scheduledAt > new Date() ? null : new Date(),
    });
  }

  if (payload.scheduledAt && payload.scheduledAt > new Date()) {
    return { sent: 0, scheduled: true };
  }

  const deliverPayload: PushPayload = {
    ...payload,
    imageMediaId: resolvedMediaId ?? payload.imageMediaId,
  };

  const { sent, vkError } = await deliverPush(deliverPayload);
  return { sent, vkError };
}

export async function notifyUsersForTrack(
  track: string | null,
  text: string,
  category: NotificationCategory,
  hash?: string,
  linkLabel?: string,
) {
  const normalizedHash = hash?.replace(/^#\/?/, '');
  if (track) {
    return sendPush({
      text,
      hash: normalizedHash,
      linkHash: normalizedHash,
      linkLabel,
      targetType: 'track',
      targetTracks: [track],
      category,
      skipBroadcastLog: true,
    });
  }
  return sendPush({
    text,
    hash: normalizedHash,
    linkHash: normalizedHash,
    linkLabel,
    targetType: 'all',
    category,
    skipBroadcastLog: true,
  });
}

export async function notifyUser(
  userId: number,
  text: string,
  category: NotificationCategory,
  hash?: string,
  linkLabel?: string,
) {
  const normalizedHash = hash?.replace(/^#\/?/, '');
  return sendPush({
    text,
    hash: normalizedHash,
    linkHash: normalizedHash,
    linkLabel,
    targetType: 'user',
    targetUserId: userId,
    category,
    skipBroadcastLog: true,
  });
}
