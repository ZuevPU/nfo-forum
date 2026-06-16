import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pointsHistory, reflectionLevelHistory, users } from '../db/schema.js';
import { sendPush } from './push.service.js';

const REFLECTION_THRESHOLDS = [0, 30, 70, 120, 200];

function calcReflectionLevel(points: number): number {
  let level = 1;
  for (let i = REFLECTION_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= REFLECTION_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 5);
}

export async function awardPoints(
  userId: number,
  points: number,
  source: string,
  sourceId?: number,
  comment?: string,
  reflectionPoints = 0,
): Promise<void> {
  await db.insert(pointsHistory).values({
    userId,
    points,
    source,
    sourceId: sourceId ?? null,
    comment: comment ?? null,
  });

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const newPoints = user.points + points;
  const newReflectionPoints = user.reflectionPoints + reflectionPoints;
  const newLevel = calcReflectionLevel(newReflectionPoints);

  await db
    .update(users)
    .set({
      points: newPoints,
      reflectionPoints: newReflectionPoints,
      reflectionLevel: newLevel,
    })
    .where(eq(users.id, userId));

  if (newLevel !== user.reflectionLevel) {
    await db.insert(reflectionLevelHistory).values({
      userId,
      oldLevel: user.reflectionLevel,
      newLevel,
    });

    if (newLevel > user.reflectionLevel) {
      void sendPush({
        text: `Поздравляем! Твой уровень рефлексии повышен до ${newLevel}! 🎉`,
        targetType: 'user',
        targetUserId: userId,
      }).catch(console.error);
    }
  }
}

export async function getTrackRank(userId: number, track: string | null): Promise<number> {
  if (!track) return 0;
  const trackUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.track, track))
    .orderBy(desc(users.points));
  const idx = trackUsers.findIndex((u) => u.id === userId);
  return idx >= 0 ? idx + 1 : 0;
}
