import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { broadcasts, users } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

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

export async function sendPush(payload: PushPayload): Promise<{ sent: number; scheduled?: boolean }> {
  let targetUsers: { id: number; vkId: string }[] = [];

  if (payload.targetType === 'user' && payload.targetUserId) {
    const [u] = await db
      .select({ id: users.id, vkId: users.vkId })
      .from(users)
      .where(eq(users.id, payload.targetUserId))
      .limit(1);
    if (u) targetUsers = [u];
  } else if (payload.targetType === 'track' && payload.targetTracks?.length) {
    targetUsers = await db
      .select({ id: users.id, vkId: users.vkId })
      .from(users)
      .where(inArray(users.track, payload.targetTracks));
  } else {
    targetUsers = await db.select({ id: users.id, vkId: users.vkId }).from(users);
  }

  await db.insert(broadcasts).values({
    text: payload.text,
    image: payload.image ?? null,
    targetType: payload.targetType,
    targetTracks: payload.targetTracks ?? null,
    targetUserId: payload.targetUserId ?? null,
    scheduledAt: payload.scheduledAt ?? null,
    sentAt: payload.scheduledAt ? null : new Date(),
  });

  if (payload.scheduledAt && payload.scheduledAt > new Date()) {
    return { sent: 0, scheduled: true };
  }

  const vkIds = targetUsers.map((u) => Number(u.vkId)).filter((id) => !isNaN(id));

  if (vkIds.length > 0) {
    await sendVkMessage(vkIds, payload.text, payload.image);
  }

  return { sent: vkIds.length };
}
