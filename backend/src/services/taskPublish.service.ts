import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks } from '../db/schema.js';

/** Persist scheduled → published once publishTime has passed. */
export async function promoteScheduledTasks(now: Date = new Date()) {
  await db
    .update(tasks)
    .set({ status: 'published' })
    .where(
      and(
        eq(tasks.status, 'scheduled'),
        isNotNull(tasks.publishTime),
        lte(tasks.publishTime, now),
      ),
    );
}
