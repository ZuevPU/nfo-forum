export const DEFAULT_REFLECTION_THRESHOLDS = [0, 30, 70, 120, 200];

export function getReflectionProgress(
  level: number,
  reflectionPoints: number,
  thresholds: number[],
): { progress: number; pointsToNextLevel: number; nextLevel: number | null } {
  const nextThreshold = thresholds[level] ?? null;
  const prevThreshold = thresholds[level - 1] ?? 0;

  if (nextThreshold == null || level >= thresholds.length) {
    return { progress: 100, pointsToNextLevel: 0, nextLevel: null };
  }

  const progress =
    nextThreshold === prevThreshold
      ? 100
      : Math.min(100, Math.max(0, ((reflectionPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100));

  return {
    progress,
    pointsToNextLevel: Math.max(0, nextThreshold - reflectionPoints),
    nextLevel: level + 1,
  };
}
