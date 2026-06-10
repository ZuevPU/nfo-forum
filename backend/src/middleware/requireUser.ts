import type { NextFunction, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
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
    const [user] = await db.select().from(users).where(eq(users.vkId, vkId)).limit(1);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = toUserDto(user);
    req.vkId = vkId;
    next();
  } catch (error) {
    console.error('requireUser DB error:', error);
    res.status(503).json({ error: 'Database temporarily unavailable' });
  }
}
