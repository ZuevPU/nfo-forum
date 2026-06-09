import { eq } from 'drizzle-orm';
import { isValidTrack } from '../constants/tracks.js';
import { db } from '../db/index.js';
import { userActivityLogs, users } from '../db/schema.js';
import type { RegisterRequest, UserDto } from '../types/api.js';

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

export async function loginByVkId(
  vkId: string,
  profile?: { firstName?: string; lastName?: string },
): Promise<{ registered: true; user: UserDto } | { registered: false }> {
  const [user] = await db.select().from(users).where(eq(users.vkId, vkId)).limit(1);

  if (!user) {
    return { registered: false };
  }

  const now = new Date();
  const updates: Partial<typeof users.$inferInsert> = { lastActiveAt: now };

  if (profile?.firstName) updates.firstName = profile.firstName;
  if (profile?.lastName !== undefined) updates.lastName = profile.lastName ?? null;

  await db.update(users).set(updates).where(eq(users.id, user.id));

  await db.insert(userActivityLogs).values({
    userId: user.id,
    action: 'login',
  });

  const updated = { ...user, ...updates, lastActiveAt: now };
  return {
    registered: true,
    user: toUserDto(updated),
  };
}

export async function registerUser(data: RegisterRequest): Promise<UserDto> {
  const { vkId, firstName, lastName, track } = data;

  if (!vkId || !firstName || !track) {
    throw new AuthValidationError('vkId, firstName and track are required');
  }

  if (!isValidTrack(track)) {
    throw new AuthValidationError('Invalid track value');
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.vkId, vkId)).limit(1);

  if (existing) {
    throw new AuthConflictError('User already registered');
  }

  const [created] = await db
    .insert(users)
    .values({
      vkId,
      firstName,
      lastName: lastName ?? null,
      track,
    })
    .returning();

  await db.insert(userActivityLogs).values({
    userId: created.id,
    action: 'register',
  });

  return toUserDto(created);
}

export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthValidationError';
  }
}

export class AuthConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConflictError';
  }
}
