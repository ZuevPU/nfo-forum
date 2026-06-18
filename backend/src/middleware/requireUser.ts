import type { NextFunction, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db, getPoolStats } from '../db/index.js';
import { users } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { withDbRetry } from '../utils/dbRetry.js';
import { getSignedVkUserId, type VkSignedRequest } from './vkLaunchParams.js';

export interface AuthenticatedRequest extends VkSignedRequest {
  user?: UserDto;
  vkId?: string;
}

function extractVkId(req: AuthenticatedRequest): string | null {
  const signedUserId = getSignedVkUserId(req);
  if (signedUserId) return signedUserId;

  const header = req.headers['x-vk-id'];
  if (typeof header === 'string' && header) return header;

  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body?.vk_id ?? body?.vkId;
  if (typeof fromBody === 'string' && fromBody) return fromBody;

  const query = req.query.vk_id ?? req.query.vkId;
  if (typeof query === 'string' && query) return query;

  return null;
}

function toUserDto(user: typeof users.$inferSelect): UserDto {
  const defaultPrefs = {
    program: true,
    questions: true,
    tasks: true,
    exchange: true,
    points: true,
  };
  return {
    id: user.id,
    vkId: user.vkId,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    track: user.track,
    points: user.points,
    reflectionLevel: user.reflectionLevel,
    reflectionPoints: user.reflectionPoints,
    notificationsEnabled: user.notificationsEnabled,
    messagesFromGroupAllowed: user.messagesFromGroupAllowed,
    notificationPrefs: (user.notificationPrefs as UserDto['notificationPrefs']) ?? defaultPrefs,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const signedUserId = getSignedVkUserId(req);
  const headerId = typeof req.headers['x-vk-id'] === 'string' ? req.headers['x-vk-id'] : null;

  if (signedUserId && headerId && signedUserId !== headerId) {
    res.status(403).json({ error: 'vk_id does not match signed launch params' });
    return;
  }

  const vkId = extractVkId(req);
  if (!vkId) {
    res.status(401).json({ error: 'vk_id is required' });
    return;
  }

  try {
    const [user] = await withDbRetry(() =>
      db.select().from(users).where(eq(users.vkId, vkId)).limit(1),
    );
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = toUserDto(user);
    req.vkId = vkId;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stats = getPoolStats();
    console.error('requireUser DB error:', message, stats);
    // #region agent log
    fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d5534'},body:JSON.stringify({sessionId:'9d5534',location:'requireUser.ts:catch',message:'requireUser DB error',data:{error:message,pool:stats,path:req.path},timestamp:Date.now(),hypothesisId:'H1-pool-exhaustion'})}).catch(()=>{});
    // #endregion
    res.status(503).json({ error: 'Database temporarily unavailable' });
  }
}
