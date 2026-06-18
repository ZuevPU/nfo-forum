import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { diagnosticProfileFeedback, systemSettings, trainerSelfDiagnostics } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { DIAGNOSTICS_DATA } from '../data/samodiagnostika.js';
import { awardAction } from './pointsConfig.service.js';

export async function getEnabledTracks(): Promise<string[]> {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'diagnostics_enabled_tracks'))
    .limit(1);

  if (setting?.value && Array.isArray(setting.value)) {
    return setting.value as string[];
  }
  return ['Обучение тренеров', 'Аттестация тренеров', 'Действующий состав АТ РСМ'];
}

export async function isTrainerTrack(track: string | null): Promise<boolean> {
  if (!track) return false;
  const enabledTracks = await getEnabledTracks();
  return enabledTracks.includes(track);
}

export async function getBlocks() {
  return DIAGNOSTICS_DATA;
}

export async function saveAnswer(
  user: UserDto,
  blockId: number,
  questionId: number,
  score: number,
  comment?: string,
) {
  const latestAttempt = await db
    .select({ attemptNumber: trainerSelfDiagnostics.attemptNumber })
    .from(trainerSelfDiagnostics)
    .where(eq(trainerSelfDiagnostics.userId, user.id))
    .orderBy(desc(trainerSelfDiagnostics.attemptNumber))
    .limit(1);

  const currentAttempt = latestAttempt.length > 0 ? latestAttempt[0].attemptNumber : 1;

  const existing = await db
    .select()
    .from(trainerSelfDiagnostics)
    .where(
      and(
        eq(trainerSelfDiagnostics.userId, user.id),
        eq(trainerSelfDiagnostics.blockId, blockId),
        eq(trainerSelfDiagnostics.attemptNumber, currentAttempt),
      ),
    )
    .limit(1);

  if (existing.length) {
    const [updated] = await db
      .update(trainerSelfDiagnostics)
      .set({ score, comment, updatedAt: new Date() })
      .where(eq(trainerSelfDiagnostics.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(trainerSelfDiagnostics)
    .values({
      userId: user.id,
      blockId,
      questionId,
      score,
      attemptNumber: currentAttempt,
      comment,
    })
    .returning();

  return created;
}

export async function getProgress(userId: number) {
  return db
    .select()
    .from(trainerSelfDiagnostics)
    .where(eq(trainerSelfDiagnostics.userId, userId))
    .orderBy(desc(trainerSelfDiagnostics.attemptNumber), trainerSelfDiagnostics.blockId);
}

export async function getLatestAttemptNumber(userId: number) {
  const latestAttempt = await db
    .select({ attemptNumber: trainerSelfDiagnostics.attemptNumber })
    .from(trainerSelfDiagnostics)
    .where(eq(trainerSelfDiagnostics.userId, userId))
    .orderBy(desc(trainerSelfDiagnostics.attemptNumber))
    .limit(1);
  return latestAttempt.length > 0 ? latestAttempt[0].attemptNumber : 1;
}

export async function saveProfileFeedback(userId: number, comment: string) {
  const attemptNumber = await getLatestAttemptNumber(userId);
  const trimmed = comment.trim();
  if (!trimmed) throw new Error('Comment is required');

  const [existing] = await db
    .select({ id: diagnosticProfileFeedback.id })
    .from(diagnosticProfileFeedback)
    .where(
      and(
        eq(diagnosticProfileFeedback.userId, userId),
        eq(diagnosticProfileFeedback.attemptNumber, attemptNumber),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(diagnosticProfileFeedback)
      .set({ comment: trimmed })
      .where(eq(diagnosticProfileFeedback.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(diagnosticProfileFeedback)
    .values({ userId, attemptNumber, comment: trimmed })
    .returning();

  const actionId = attemptNumber <= 1 ? 'diagnostics_profile_comment' : 'diagnostics_profile_comment_exit';
  await awardAction(userId, actionId, created.id, { skipIfSourceIdExists: true });

  return created;
}

export async function getProfileFeedback(userId: number, attemptNumber?: number) {
  const attempt = attemptNumber ?? (await getLatestAttemptNumber(userId));
  const [row] = await db
    .select()
    .from(diagnosticProfileFeedback)
    .where(
      and(
        eq(diagnosticProfileFeedback.userId, userId),
        eq(diagnosticProfileFeedback.attemptNumber, attempt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function completeAttempt(userId: number) {
  const currentAttempt = await getLatestAttemptNumber(userId);

  const answers = await db
    .select()
    .from(trainerSelfDiagnostics)
    .where(
      and(
        eq(trainerSelfDiagnostics.userId, userId),
        eq(trainerSelfDiagnostics.attemptNumber, currentAttempt),
      ),
    );

  if (answers.length >= 9) {
    const actionId = currentAttempt <= 1 ? 'diagnostics_complete_entry' : 'diagnostics_complete_exit';
    await awardAction(userId, actionId, currentAttempt, { skipIfSourceIdExists: true });
    return { success: true, attempt: currentAttempt };
  }

  return { success: false, reason: 'Not all blocks completed' };
}

export async function startNewAttempt(userId: number) {
  const latestAttempt = await db
    .select({ attemptNumber: trainerSelfDiagnostics.attemptNumber })
    .from(trainerSelfDiagnostics)
    .where(eq(trainerSelfDiagnostics.userId, userId))
    .orderBy(desc(trainerSelfDiagnostics.attemptNumber))
    .limit(1);

  return (latestAttempt.length > 0 ? latestAttempt[0].attemptNumber : 0) + 1;
}
