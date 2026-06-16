import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { broadcasts, users } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';

interface PushPayload {
  text: string;
  image?: string;
  targetType: 'all' | 'track' | 'user';
  targetTracks?: string[];
  targetUserId?: number;
  scheduledAt?: Date;
}

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

async function resolveTargetUsers(payload: PushPayload) {
  if (payload.targetType === 'user' && payload.targetUserId) {
    const [u] = await db
      .select({ id: users.id, vkId: users.vkId })
      .from(users)
      .where(and(eq(users.id, payload.targetUserId), eq(users.notificationsEnabled, true)))
      .limit(1);
    return u ? [u] : [];
  }
  if (payload.targetType === 'track' && payload.targetTracks?.length) {
    return db
      .select({ id: users.id, vkId: users.vkId })
      .from(users)
      .where(and(inArray(users.track, payload.targetTracks), eq(users.notificationsEnabled, true)));
  }
  return db
    .select({ id: users.id, vkId: users.vkId })
    .from(users)
    .where(eq(users.notificationsEnabled, true));
}

export async function deliverPush(payload: PushPayload): Promise<number> {
  const targetUsers = await resolveTargetUsers(payload);
  const vkIds = targetUsers.map((u) => Number(u.vkId)).filter((id) => !isNaN(id));
  if (vkIds.length > 0) {
    await sendVkMessage(vkIds, payload.text, payload.image);
  }
  return vkIds.length;
}

export async function sendPush(payload: PushPayload): Promise<{ sent: number; scheduled?: boolean }> {
  await db.insert(broadcasts).values({
    text: payload.text,
    image: payload.image ?? null,
    targetType: payload.targetType,
    targetTracks: payload.targetTracks ?? null,
    targetUserId: payload.targetUserId ?? null,
    scheduledAt: payload.scheduledAt ?? null,
    sentAt: payload.scheduledAt && payload.scheduledAt > new Date() ? null : new Date(),
  });

  if (payload.scheduledAt && payload.scheduledAt > new Date()) {
    return { sent: 0, scheduled: true };
  }

  const sent = await deliverPush(payload);
  return { sent };
}
