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
    title: 'Планирование программы',
    questions: [
      { id: 1, text: 'Я умею формулировать цели программы' },
      { id: 2, text: 'Я учитываю потребности аудитории' },
    ],
  },
  {
    id: 2,
    title: 'Проведение занятий',
    questions: [
      { id: 3, text: 'Я владею методами активного обучения' },
      { id: 4, text: 'Я умею работать с группой' },
    ],
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
