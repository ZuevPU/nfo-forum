import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { nfoDayReflections, reflectionAnswers, reflectionQuestions } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardPoints } from './points.service.js';

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

  const [created] = await db
    .insert(reflectionAnswers)
    .values({ userId: user.id, questionId, answerText })
    .returning();

  await awardPoints(user.id, question.points, 'reflection_answer', created.id, undefined, question.points);
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

export async function submitNfoDayReflection(
  user: UserDto,
  answerText: string,
  factors: string[],
) {
  const today = new Date().toISOString().split('T')[0];
  const [created] = await db
    .insert(nfoDayReflections)
    .values({
      userId: user.id,
      date: today,
      answerText,
      factors,
    })
    .returning();

  await awardPoints(user.id, 10, 'nfo_day_reflection', created.id, undefined, 10);
  return created;
}

export async function getNfoDayReflectionToday(userId: number) {
  const today = new Date().toISOString().split('T')[0];
  const [row] = await db
    .select()
    .from(nfoDayReflections)
    .where(and(eq(nfoDayReflections.userId, userId), eq(nfoDayReflections.date, today)))
    .limit(1);

  return row ?? null;
}
