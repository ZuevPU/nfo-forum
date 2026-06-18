export const DEFAULT_REFLECTION_THRESHOLDS = [0, 62, 124, 186, 248];

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
  4: 'Ты видишь форум как целое. Понимаешь, что менялось, почему и что это значит для тебя.',
  5: 'Ты не просто участвовал — ты собрал свой путь. Есть точка А, точка Б и понимание, куда дальше.',
};

export const REFLECTION_LEVEL_SCENARIOS: Record<number, string> = {
  1: 'Входной вопрос + несколько чекинов по эмоции/энергии',
  2: 'Входной вопрос + все чекины без комментариев + часть вечерней рефлексии',
  3: 'Входной вопрос + все чекины + рефлексия всех дней без комментариев',
  4: 'Вся обязательная рефлексия + часть комментариев и/или обмен опытом',
  5: 'Полная рефлексия + все необязательные комментарии + выходной вопрос + активный обмен опытом',
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
  reflection: 235,
  exchange: 75,
  tasks: 180,
  reflectionWithExchange: 310,
} as const;
