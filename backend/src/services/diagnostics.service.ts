import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { systemSettings, trainerSelfDiagnostics } from '../db/schema.js';
import type { UserDto } from '../types/api.js';

const TRAINER_TRACKS = [
  'Обучение тренеров',
  'Аттестация тренеров',
  'Действующий состав АТ РСМ',
];

const DEFAULT_BLOCKS = [
  {
    id: 1,
    title: 'Методическое мастерство',
    questions: [{ id: 1, text: 'Оцените свой уровень методического мастерства' }],
  },
  {
    id: 2,
    title: 'Работа с содержанием',
    questions: [{ id: 2, text: 'Оцените свой уровень работы с содержанием' }],
  },
  {
    id: 3,
    title: 'Конструирование и проведение игр и упражнений',
    questions: [{ id: 3, text: 'Оцените свой уровень конструирования игр' }],
  },
  {
    id: 4,
    title: 'Работа с группой',
    questions: [{ id: 4, text: 'Оцените свой уровень работы с группой' }],
  },
  {
    id: 5,
    title: 'Взаимодействие с заказчиком',
    questions: [{ id: 5, text: 'Оцените свой уровень взаимодействия с заказчиком' }],
  },
  {
    id: 6,
    title: 'Организация обучения',
    questions: [{ id: 6, text: 'Оцените свой уровень организации обучения' }],
  },
  {
    id: 7,
    title: 'Оценка результатов обучения',
    questions: [{ id: 7, text: 'Оцените свой уровень оценки результатов' }],
  },
  {
    id: 8,
    title: 'Визуализация',
    questions: [{ id: 8, text: 'Оцените свой уровень визуализации' }],
  },
  {
    id: 9,
    title: 'Работа с искусственным интеллектом',
    questions: [{ id: 9, text: 'Оцените свой уровень работы с ИИ' }],
  },
];

export function isTrainerTrack(track: string | null): boolean {
  return track != null && TRAINER_TRACKS.includes(track);
}

export async function getBlocks() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'diagnostics_blocks'))
    .limit(1);

  if (setting?.value) {
    return setting.value as typeof DEFAULT_BLOCKS;
  }
  return DEFAULT_BLOCKS;
}

export async function saveAnswer(
  user: UserDto,
  blockId: number,
  questionId: number,
  score: number,
) {
  const existing = await db
    .select()
    .from(trainerSelfDiagnostics)
    .where(
      and(
        eq(trainerSelfDiagnostics.userId, user.id),
        eq(trainerSelfDiagnostics.blockId, blockId),
        eq(trainerSelfDiagnostics.questionId, questionId),
      ),
    )
    .limit(1);

  if (existing.length) {
    const [updated] = await db
      .update(trainerSelfDiagnostics)
      .set({ score, updatedAt: new Date() })
      .where(eq(trainerSelfDiagnostics.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(trainerSelfDiagnostics)
    .values({ userId: user.id, blockId, questionId, score })
    .returning();

  return created;
}

export async function getProgress(userId: number) {
  return db
    .select()
    .from(trainerSelfDiagnostics)
    .where(eq(trainerSelfDiagnostics.userId, userId));
}
