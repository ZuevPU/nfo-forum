import { eq } from 'drizzle-orm';
import { DEFAULT_REFLECTION_THRESHOLDS } from '../constants/reflectionLevels.js';
import { db } from '../db/index.js';
import { systemSettings } from '../db/schema.js';

export async function getReflectionLevelSettings() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'reflection_level_thresholds'))
    .limit(1);

  const raw = setting?.value as { thresholds?: number[] } | undefined;
  const thresholds =
    Array.isArray(raw?.thresholds) && raw.thresholds.length >= 2
      ? raw.thresholds
      : [...DEFAULT_REFLECTION_THRESHOLDS];

  return { thresholds };
}

export async function setReflectionLevelSettings(thresholds: number[]) {
  const normalized = thresholds.length >= 2 ? thresholds : [...DEFAULT_REFLECTION_THRESHOLDS];
  const sorted = [...normalized].sort((a, b) => a - b);
  if (sorted[0] !== 0) sorted.unshift(0);

  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'reflection_level_thresholds'))
    .limit(1);

  const value = { thresholds: sorted };

  if (existing) {
    await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'reflection_level_thresholds', value });
  }

  return { thresholds: sorted };
}
