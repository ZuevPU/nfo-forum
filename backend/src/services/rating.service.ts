import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
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

  return {
    list,
    me: {
      points: user.points,
      trackRank: myRank,
      reflectionLevel: user.reflectionLevel,
      reflectionPoints: user.reflectionPoints,
    },
  };
}
