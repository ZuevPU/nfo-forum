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
