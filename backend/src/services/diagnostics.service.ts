import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { systemSettings, trainerSelfDiagnostics } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { DIAGNOSTICS_DATA } from '../data/samodiagnostika.js';
import { awardPoints } from './points.service.js';

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
  questionId: number, // actually level (1-5) based on the skill
  score: number, // the level they chose
  comment?: string,
) {
  // Find the latest attempt number for this user
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
        eq(trainerSelfDiagnostics.attemptNumber, currentAttempt)
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
      comment
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

export async function completeAttempt(userId: number) {
  const latestAttempt = await db
    .select({ attemptNumber: trainerSelfDiagnostics.attemptNumber })
    .from(trainerSelfDiagnostics)
    .where(eq(trainerSelfDiagnostics.userId, userId))
    .orderBy(desc(trainerSelfDiagnostics.attemptNumber))
    .limit(1);

  const currentAttempt = latestAttempt.length > 0 ? latestAttempt[0].attemptNumber : 1;

  // Verify they answered all 9 blocks for this attempt
  const answers = await db
    .select()
    .from(trainerSelfDiagnostics)
    .where(
      and(
        eq(trainerSelfDiagnostics.userId, userId),
        eq(trainerSelfDiagnostics.attemptNumber, currentAttempt)
      )
    );

  if (answers.length >= 9) {
    // Check if they already got points for this attempt
    // Points sourceId can be combination of userId and attemptNumber or just award it
    await awardPoints(userId, 100, 'diagnostics_complete', currentAttempt);
    
    // Start a new attempt for next time
    // We do this by just incrementing the attempt number if they choose to start over.
    // So "completeAttempt" just means we award points.
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

  const newAttempt = (latestAttempt.length > 0 ? latestAttempt[0].attemptNumber : 0) + 1;
  return newAttempt;
}
