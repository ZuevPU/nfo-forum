import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { broadcasts, users } from '../db/schema.js';
import {
  DEFAULT_NOTIFICATION_PREFS,
  shouldNotify,
  type NotificationCategory,
  type NotificationPrefs,
} from '../constants/notifications.js';
import { eq, inArray } from 'drizzle-orm';

interface PushPayload {
  text: string;
  image?: string;
  targetType: 'all' | 'track' | 'user';
  targetTracks?: string[];
  targetUserId?: number;
  scheduledAt?: Date;
  category?: NotificationCategory;
  skipBroadcastLog?: boolean;
}

type UserRow = {
  id: number;
  vkId: string;
  notificationsEnabled: boolean;
  notificationPrefs: NotificationPrefs | null;
  track: string | null;
};

async function sendVkMessage(vkUserIds: number[], message: string, image?: string): Promise<void> {
  if (!env.VK_GROUP_TOKEN) {
    console.warn(
      `[push] VK_GROUP_TOKEN not set (group ${env.VK_GROUP_ID || 'n/a'}), skipping`,
    );
    return;
  }

  const userIds = vkUserIds.join(',');
  const finalMessage = image ? `${message}\n\n${image}` : message;

  const params = new URLSearchParams({
    user_ids: userIds,
    message: finalMessage,
    random_id: String(Math.floor(Math.random() * 1e9)),
    access_token: env.VK_GROUP_TOKEN,
    v: '5.199',
  });

  const response = await fetch(`https://api.vk.com/method/messages.send?${params}`, {
    method: 'POST',
  });

  const data = (await response.json()) as { error?: unknown };
  if (data.error) {
    console.error('[push] VK API error:', data.error);
  }
}

function filterByCategory(rows: UserRow[], category?: NotificationCategory): UserRow[] {
  if (!category) return rows.filter((u) => u.notificationsEnabled);
  return rows.filter((u) =>
    shouldNotify(u.notificationsEnabled, u.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS, category),
  );
}

async function resolveTargetUsers(payload: PushPayload): Promise<UserRow[]> {
  const selectFields = {
    id: users.id,
    vkId: users.vkId,
    notificationsEnabled: users.notificationsEnabled,
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

export async function deliverPush(payload: PushPayload): Promise<number> {
  const targetUsers = await resolveTargetUsers(payload);
  const vkIds = targetUsers.map((u) => Number(u.vkId)).filter((id) => !isNaN(id));
  if (vkIds.length > 0) {
    await sendVkMessage(vkIds, payload.text, payload.image);
  }
  return vkIds.length;
}

export async function sendPush(
  payload: PushPayload,
): Promise<{ sent: number; scheduled?: boolean }> {
  if (!payload.skipBroadcastLog) {
    await db.insert(broadcasts).values({
      text: payload.text,
      image: payload.image ?? null,
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

  const sent = await deliverPush(payload);
  return { sent };
}

export async function notifyUsersForTrack(
  track: string | null,
  text: string,
  category: NotificationCategory,
  hash?: string,
) {
  const message = hash ? `${text}\n${hash}` : text;
  if (track) {
    return sendPush({
      text: message,
      targetType: 'track',
      targetTracks: [track],
      category,
      skipBroadcastLog: true,
    });
  }
  return sendPush({
    text: message,
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
) {
  const message = hash ? `${text}\n${hash}` : text;
  return sendPush({
    text: message,
    targetType: 'user',
    targetUserId: userId,
    category,
    skipBroadcastLog: true,
  });
}
