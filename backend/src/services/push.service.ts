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
import { recordUserNotifications } from './notifications.service.js';

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

function formatVkSendResponse(
  response?: number | Array<{ message_id?: number }>,
): string {
  if (response == null) return 'n/a';
  if (typeof response === 'number') return String(response);
  if (!Array.isArray(response) || response.length === 0) return 'n/a';
  const ids = response.map((r) => r.message_id).filter((id): id is number => id != null);
  if (ids.length === 0) return `batch=${response.length}`;
  if (ids.length === 1) return String(ids[0]);
  return `${ids.length} ids, first=${ids[0]}`;
}

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

  const data = (await response.json()) as {
    error?: VkApiError;
    response?: number | Array<{ peer_id?: number; message_id?: number; conversation_message_id?: number }>;
  };
  if (data.error) {
    console.error(
      `[push] VK API error for ${vkUserIds.length} user(s):`,
      data.error.error_code,
      data.error.error_msg,
    );
    return data.error;
  }

  console.info(
    `[push] messages.send ok for ${vkUserIds.length} user(s), message_id=${formatVkSendResponse(data.response)}`,
  );
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

const userSelectFields = {
  id: users.id,
  vkId: users.vkId,
  notificationsEnabled: users.notificationsEnabled,
  messagesFromGroupAllowed: users.messagesFromGroupAllowed,
  notificationPrefs: users.notificationPrefs,
  track: users.track,
};

async function resolveRawTargetUsers(payload: PushPayload): Promise<UserRow[]> {
  if (payload.targetType === 'user' && payload.targetUserId) {
    const [u] = await db
      .select(userSelectFields)
      .from(users)
      .where(eq(users.id, payload.targetUserId))
      .limit(1);
    return u ? [u as UserRow] : [];
  }

  if (payload.targetType === 'track' && payload.targetTracks?.length) {
    const rows = await db
      .select(userSelectFields)
      .from(users)
      .where(inArray(users.track, payload.targetTracks));
    return rows as UserRow[];
  }

  const rows = await db.select(userSelectFields).from(users);
  return rows as UserRow[];
}

async function resolveTargetUsers(payload: PushPayload): Promise<UserRow[]> {
  const rows = await resolveRawTargetUsers(payload);
  return filterByCategory(rows, payload.category);
}

export async function getPushSubscriptionStats() {
  const rows = await db
    .select({
      role: users.role,
      messagesFromGroupAllowed: users.messagesFromGroupAllowed,
      notificationsEnabled: users.notificationsEnabled,
    })
    .from(users);

  const total = rows.length;
  const withMessages = rows.filter((r) => r.messagesFromGroupAllowed).length;
  const fullyEligible = rows.filter((r) => r.messagesFromGroupAllowed && r.notificationsEnabled).length;
  const admins = rows.filter((r) => r.role === 'admin');
  const adminsWithMessages = admins.filter((r) => r.messagesFromGroupAllowed).length;

  return {
    total,
    withMessages,
    fullyEligible,
    withoutMessages: total - withMessages,
    adminsTotal: admins.length,
    adminsWithMessages,
    participantsTotal: total - admins.length,
    participantsWithMessages: withMessages - adminsWithMessages,
  };
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
): Promise<{ sent: number; candidates: number; eligible: number; vkError?: VkApiError | null }> {
  const candidates = await resolveRawTargetUsers(payload);

  // Дублируем уведомление в персональную ленту всем адресатам — независимо от VK-разрешений.
  await recordUserNotifications(
    candidates.map((u) => u.id),
    {
      text: payload.text,
      category: payload.category,
      linkHash: payload.linkHash ?? payload.hash,
      linkLabel: payload.linkLabel,
    },
  ).catch((e) => console.error('[push] failed to record inbox notifications', e));

  const targetUsers = filterByCategory(candidates, payload.category);
  const vkIds = targetUsers.map((u) => Number(u.vkId)).filter((id) => !isNaN(id));
  const invalidVkIdCount = targetUsers.length - vkIds.length;

  console.info(
    `[push] target=${payload.targetType} category=${payload.category ?? 'none'} candidates=${candidates.length} eligible=${targetUsers.length}${invalidVkIdCount > 0 ? ` invalidVkId=${invalidVkIdCount}` : ''}`,
  );

  if (vkIds.length === 0) {
    const blockedByMessages = candidates.filter((u) => !u.messagesFromGroupAllowed).length;
    const blockedByNotifications = candidates.filter(
      (u) => u.messagesFromGroupAllowed && !u.notificationsEnabled,
    ).length;
    const blockedByCategory = candidates.filter(
      (u) =>
        u.messagesFromGroupAllowed &&
        u.notificationsEnabled &&
        payload.category &&
        !shouldNotify(
          u.notificationsEnabled,
          u.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS,
          payload.category,
        ),
    ).length;
    console.info(
      `[push] No eligible recipients: blockedByMessages=${blockedByMessages} blockedByNotifications=${blockedByNotifications} blockedByCategory=${blockedByCategory}`,
    );
    return { sent: 0, candidates: candidates.length, eligible: 0 };
  }

  const message = buildMessage(payload);
  const attachment = await resolvePhotoAttachment(payload);
  const vkError = await sendVkMessage(vkIds, message, attachment);
  const sent = vkError ? 0 : vkIds.length;
  console.info(`[push] delivered sent=${sent}${vkError ? ` vkError=${vkError.error_code}` : ''}`);
  return { sent, candidates: candidates.length, eligible: targetUsers.length, vkError };
}

export async function sendPush(
  payload: PushPayload,
): Promise<{
  sent: number;
  scheduled?: boolean;
  candidates?: number;
  eligible?: number;
  vkError?: VkApiError | null;
}> {
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

  const { sent, candidates, eligible, vkError } = await deliverPush(deliverPayload);
  return { sent, candidates, eligible, vkError };
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
