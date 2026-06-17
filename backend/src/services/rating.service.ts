import { desc, eq } from 'drizzle-orm';
import { DEFAULT_REFLECTION_THRESHOLDS } from '../constants/reflectionLevels.js';
import { REFLECTION_LEVEL_NAMES } from '../constants/nfoFactors.js';
import { db } from '../db/index.js';
import { pointsHistory, reflectionLevelHistory, users } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { getReflectionLevelSettings } from './reflectionLevelSettings.service.js';
import { getTrackRank } from './points.service.js';

export async function getRating(scope: 'track' | 'all', user: UserDto) {
  let rows;
  if (scope === 'track' && user.track) {
    rows = await db
      .select()
      .from(users)
      .where(eq(users.track, user.track))
      .orderBy(desc(users.points));
  } else {
    rows = await db.select().from(users).orderBy(desc(users.points));
  }

  const list = rows.map((u, i) => ({
    position: i + 1,
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    track: u.track,
    points: u.points,
    isMe: u.id === user.id,
  }));

  const myRank = await getTrackRank(user.id, user.track);
  const { thresholds } = await getReflectionLevelSettings();

  return {
    list,
    me: {
      points: user.points,
      trackRank: myRank,
      reflectionLevel: user.reflectionLevel,
      reflectionPoints: user.reflectionPoints,
      reflectionLevelName: REFLECTION_LEVEL_NAMES[user.reflectionLevel] ?? '',
      nextLevelPoints: user.reflectionLevel < thresholds.length ? thresholds[user.reflectionLevel] : null,
      reflectionThresholds: thresholds,
    },
  };
}

export async function getPointsHistory(userId: number) {
  return db
    .select()
    .from(pointsHistory)
    .where(eq(pointsHistory.userId, userId))
    .orderBy(desc(pointsHistory.createdAt))
    .limit(50);
}

export async function getReflectionLevelHistory(userId: number) {
  return db
    .select()
    .from(reflectionLevelHistory)
    .where(eq(reflectionLevelHistory.userId, userId))
    .orderBy(desc(reflectionLevelHistory.createdAt));
}
