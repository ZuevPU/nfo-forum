import { db } from '../db/index.js';
import { userActivityLogs } from '../db/schema.js';

export async function logActivity(userId: number, action: string): Promise<void> {
  try {
    await db.insert(userActivityLogs).values({ userId, action });
  } catch (error) {
    console.warn('[activity] Failed to log action:', action, error instanceof Error ? error.message : error);
  }
}
