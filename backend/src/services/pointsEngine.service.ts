import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  DEFAULT_POINT_RULES,
  mergePointRule,
  type PointActionRule,
  type PointsConfigValue,
} from '../constants/pointsSystem.js';
import { pointsHistory } from '../db/schema.js';
import { getPointsSettings } from './admin.service.js';
import { awardPoints } from './points.service.js';

export type AwardActionResult = {
  awarded: number;
  ratingPoints: number;
  reflectionPoints: number;
  capped: boolean;
};

async function getMergedRules(): Promise<Map<string, PointActionRule>> {
  const config = await getPointsSettings();
  const overrides = (config as PointsConfigValue).rules ?? {};
  const map = new Map<string, PointActionRule>();
  for (const base of DEFAULT_POINT_RULES) {
    const merged = mergePointRule(base.id, overrides[base.id]);
    if (merged) map.set(base.id, merged);
  }
  return map;
}

async function getAwardStats(userId: number, actionId: string) {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${pointsHistory.points}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(pointsHistory)
    .where(and(eq(pointsHistory.userId, userId), eq(pointsHistory.source, actionId)));

  return { total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
}

async function alreadyAwardedForSource(userId: number, actionId: string, sourceId: number) {
  const [row] = await db
    .select({ id: pointsHistory.id })
    .from(pointsHistory)
    .where(
      and(
        eq(pointsHistory.userId, userId),
        eq(pointsHistory.source, actionId),
        eq(pointsHistory.sourceId, sourceId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function getPointsSystemForAdmin() {
  const config = await getPointsSettings();
  const overrides = (config as PointsConfigValue).rules ?? {};
  return {
    rules: DEFAULT_POINT_RULES.map((base) => {
      const merged = mergePointRule(base.id, overrides[base.id])!;
      return {
        ...base,
        pointsPerAction: merged.pointsPerAction,
        maxTotal: merged.maxTotal,
        maxCount: merged.maxCount,
      };
    }),
    overrides,
  };
}

export async function awardAction(
  userId: number,
  actionId: string,
  sourceId?: number,
  options?: {
    pointsOverride?: number;
    comment?: string;
    skipIfSourceIdExists?: boolean;
  },
): Promise<AwardActionResult> {
  const rules = await getMergedRules();
  const rule = rules.get(actionId);
  if (!rule || rule.pointsPerAction <= 0) {
    return { awarded: 0, ratingPoints: 0, reflectionPoints: 0, capped: false };
  }

  if (options?.skipIfSourceIdExists && sourceId != null) {
    if (await alreadyAwardedForSource(userId, actionId, sourceId)) {
      return { awarded: 0, ratingPoints: 0, reflectionPoints: 0, capped: false };
    }
  }

  const stats = await getAwardStats(userId, actionId);
  if (rule.maxCount != null && stats.count >= rule.maxCount) {
    return { awarded: 0, ratingPoints: 0, reflectionPoints: 0, capped: true };
  }

  let amount = options?.pointsOverride ?? rule.pointsPerAction;
  if (rule.maxTotal > 0 && stats.total + amount > rule.maxTotal) {
    amount = Math.max(0, rule.maxTotal - stats.total);
  }
  if (amount <= 0) {
    return { awarded: 0, ratingPoints: 0, reflectionPoints: 0, capped: true };
  }

  const ratingPoints = rule.countsToReflection ? 0 : amount;
  const reflectionPoints = rule.countsToReflection ? amount : 0;

  await awardPoints(userId, ratingPoints, actionId, sourceId, options?.comment, reflectionPoints, amount);

  return { awarded: amount, ratingPoints, reflectionPoints, capped: false };
}
