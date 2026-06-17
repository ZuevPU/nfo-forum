export const DEFAULT_REFLECTION_THRESHOLDS = [0, 30, 70, 120, 200];

export function calcReflectionLevel(points: number, thresholds: number[]): number {
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, thresholds.length);
}

export function getNextLevelThreshold(level: number, thresholds: number[]): number | null {
  if (level >= thresholds.length) return null;
  return thresholds[level] ?? null;
}
