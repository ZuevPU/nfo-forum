import { eq } from 'drizzle-orm';
import { isValidTrack } from '../constants/tracks.js';
import { db } from '../db/index.js';
import { userActivityLogs, users } from '../db/schema.js';
import type { RegisterRequest, UserDto } from '../types/api.js';

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

export async function updateProfile(userId: number, firstName: string, lastName?: string) {
  if (!firstName.trim()) throw new AuthValidationError('firstName is required');
  const [updated] = await db
    .update(users)
    .set({ firstName: firstName.trim(), lastName: lastName?.trim() || null })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new AuthValidationError('User not found');
  return toUserDto(updated);
}

export async function updateNotificationPrefs(userId: number, prefs: NonNullable<UserDto['notificationPrefs']>) {
  const enabled = Object.values(prefs).some(Boolean);
  const [updated] = await db
    .update(users)
    .set({ notificationPrefs: prefs, notificationsEnabled: enabled })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new AuthValidationError('User not found');
  return toUserDto(updated);
}

export async function updateMessagesFromGroupAllowed(userId: number, allowed: boolean) {
  const [updated] = await db
    .update(users)
    .set({ messagesFromGroupAllowed: allowed })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new AuthValidationError('User not found');
  return toUserDto(updated);
}

export async function deleteUserAccount(userId: number): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
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
