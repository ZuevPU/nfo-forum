import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { NFO_DAY_FACTORS, NFO_DAY_QUESTION } from '../constants/nfoFactors.js';
import { nfoDayReflections, pointsHistory, reflectionAnswers, reflectionQuestions, systemSettings } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { moscowDateString } from '../utils/moscowTime.js';
import { isNfoDayTimeOpen } from '../utils/slotMatching.js';
import { awardPointsForSource } from './pointsConfig.service.js';

export async function getQuestions(user: UserDto) {
  const now = new Date();
  const questions = await db
    .select()
    .from(reflectionQuestions)
    .orderBy(asc(reflectionQuestions.publishTime));

  const answers = await db
    .select()
    .from(reflectionAnswers)
    .where(eq(reflectionAnswers.userId, user.id));

  const answeredIds = new Set(answers.map((a) => a.questionId));

  return questions
    .filter((q) => !q.track || q.track === user.track)
    .filter((q) => !q.endTime || q.endTime > now)
    .map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      groupId: q.groupId,
      points: q.points,
      publishTime: q.publishTime.toISOString(),
      endTime: q.endTime?.toISOString() ?? null,
      isLocked: q.publishTime > now,
      isAnswered: answeredIds.has(q.id),
      allowMultiple: q.allowMultiple,
      unlockLabel:
        q.publishTime > now
          ? `Откроется в ${q.publishTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
          : null,
    }));
}

export async function submitAnswer(user: UserDto, questionId: number, answerText: string) {
  const [question] = await db
    .select()
    .from(reflectionQuestions)
    .where(eq(reflectionQuestions.id, questionId))
    .limit(1);

  if (!question) throw new Error('Question not found');
  if (question.publishTime > new Date()) throw new Error('Question is locked');

  const [existingAnswer] = await db
    .select({ id: reflectionAnswers.id })
    .from(reflectionAnswers)
    .where(and(eq(reflectionAnswers.userId, user.id), eq(reflectionAnswers.questionId, questionId)))
    .limit(1);

  if (existingAnswer && !question.allowMultiple) throw new Error('Already answered');

  const [created] = await db
    .insert(reflectionAnswers)
    .values({ userId: user.id, questionId, answerText })
    .returning();

  if (!existingAnswer) {
    await awardPointsForSource(
      user.id,
      'reflection_answer',
      created.id,
      undefined,
      question.points,
      question.points,
    );
  }
  return created;
}

export async function getEveningQuestions(user: UserDto) {
  const now = new Date();
  const questions = await db
    .select()
    .from(reflectionQuestions)
    .where(and(eq(reflectionQuestions.type, 'evening'), lte(reflectionQuestions.publishTime, now)))
    .orderBy(asc(reflectionQuestions.publishTime));

  return questions.filter((q) => !q.track || q.track === user.track);
}

export async function getNfoDayConfig() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'nfo_day_config'))
    .limit(1);

  const value = (setting?.value ?? {}) as { publishHour?: number; publishMinute?: number; points?: number };
  const publishHour = value.publishHour ?? 19;
  const publishMinute = value.publishMinute ?? 30;
  return {
    question: NFO_DAY_QUESTION,
    factors: [...NFO_DAY_FACTORS],
    publishHour,
    publishMinute,
    points: value.points ?? 10,
    isOpen: isNfoDayTimeOpen(publishHour, publishMinute),
  };
}

export async function submitNfoDayReflection(
  user: UserDto,
  answerText: string,
  factors: string[],
) {
  if (factors.length === 0 || factors.length > 3) {
    throw new Error('Select 1 to 3 factors');
  }

  const invalid = factors.filter((f) => !NFO_DAY_FACTORS.includes(f as (typeof NFO_DAY_FACTORS)[number]));
  if (invalid.length > 0) throw new Error('Invalid factors');

  const today = moscowDateString();
  const [existing] = await db
    .select({ id: nfoDayReflections.id })
    .from(nfoDayReflections)
    .where(and(eq(nfoDayReflections.userId, user.id), eq(nfoDayReflections.date, today)))
    .limit(1);

  if (existing) throw new Error('Already submitted today');

  const config = await getNfoDayConfig();
  if (!isNfoDayTimeOpen(config.publishHour, config.publishMinute)) {
    throw new Error('NFO day reflection is not open yet');
  }

  const [created] = await db
    .insert(nfoDayReflections)
    .values({
      userId: user.id,
      date: today,
      answerText,
      factors,
    })
    .returning();

  const [existingPoints] = await db
    .select({ id: pointsHistory.id })
    .from(pointsHistory)
    .where(and(eq(pointsHistory.source, 'nfo_day_reflection'), eq(pointsHistory.sourceId, created.id)))
    .limit(1);

  if (!existingPoints) {
    await awardPointsForSource(
      user.id,
      'nfo_day_reflection',
      created.id,
      undefined,
      config.points,
      config.points,
    );
  }
  return created;
}

export async function getNfoDayReflectionToday(userId: number) {
  const today = moscowDateString();
  const [row] = await db
    .select()
    .from(nfoDayReflections)
    .where(and(eq(nfoDayReflections.userId, userId), eq(nfoDayReflections.date, today)))
    .limit(1);

  return row ?? null;
}
