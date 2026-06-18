export const DEFAULT_REFLECTION_THRESHOLDS = [0, 55, 110, 164, 218];

export const REFLECTION_LEVEL_NAMES: Record<number, string> = {
  1: 'Начал задумываться',
  2: 'Удерживаю важное',
  3: 'Соединяю опыт',
  4: 'Вижу картину целиком',
  5: 'Строю свою траекторию',
};

export const REFLECTION_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Ты начинаешь замечать происходящее и фиксировать свои реакции. Это первый шаг — и он уже важен.',
  2: 'Ты удерживаешь важные мысли и наблюдения. Что-то начинает складываться в картину.',
  3: 'Ты связываешь происходящее со своим профессиональным опытом. Появляются новые смыслы.',
  4: 'Ты видишь программу целиком и понимаешь, как части связаны между собой.',
  5: 'Ты не просто участвовал — ты собрал свой путь. Есть точка А, точка Б и понимание, куда дальше.',
};

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

export const SECTION_MAX_TOTALS = {
  reflection: 228,
  exchange: 45,
  tasks: 205,
  reflectionWithExchange: 273,
} as const;
