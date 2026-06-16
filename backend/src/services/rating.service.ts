import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pointsHistory, users } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { getTrackRank } from './points.service.js';
import { REFLECTION_LEVEL_NAMES } from '../constants/nfoFactors.js';

const REFLECTION_THRESHOLDS = [0, 30, 70, 120, 200];

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

  return {
    list,
    me: {
      points: user.points,
      trackRank: myRank,
      reflectionLevel: user.reflectionLevel,
      reflectionPoints: user.reflectionPoints,
      reflectionLevelName: REFLECTION_LEVEL_NAMES[user.reflectionLevel] ?? '',
      nextLevelPoints: user.reflectionLevel < 5 ? REFLECTION_THRESHOLDS[user.reflectionLevel] : null,
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
