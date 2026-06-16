import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  exchangeAnswers,
  exchangeAssignments,
  exchangeQuestions,
  exchangeReactions,
  users,
} from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardPoints } from './points.service.js';

export async function createQuestion(
  user: UserDto,
  text: string,
  scope: 'all' | 'track',
): Promise<{ id: number }> {
  const [created] = await db
    .insert(exchangeQuestions)
    .values({
      userId: user.id,
      text,
      scope,
      status: 'pending',
      publishTime: null,
    })
    .returning({ id: exchangeQuestions.id });

  await awardPoints(user.id, 5, 'exchange_question', created.id);
  return created;
}

export async function getFeed(user: UserDto) {
  const rows = await db
    .select({
      id: exchangeQuestions.id,
      text: exchangeQuestions.text,
      scope: exchangeQuestions.scope,
      userId: exchangeQuestions.userId,
      createdAt: exchangeQuestions.createdAt,
      publishTime: exchangeQuestions.publishTime,
      answerCount: sql<number>`count(${exchangeAnswers.id})::int`,
    })
    .from(exchangeQuestions)
    .leftJoin(exchangeAnswers, eq(exchangeAnswers.questionId, exchangeQuestions.id))
    .where(eq(exchangeQuestions.status, 'published'))
    .groupBy(exchangeQuestions.id)
    .orderBy(desc(exchangeQuestions.publishTime));

  return rows.map((q) => ({
    id: q.id,
    text: q.text,
    scope: q.scope,
    scopeLabel: q.scope === 'all' ? 'Все треки' : (user.track ?? 'Трек'),
    answerCount: Number(q.answerCount),
    isMine: q.userId === user.id,
    createdAt: (q.publishTime ?? q.createdAt).toISOString(),
  }));
}

export async function createAnswer(user: UserDto, questionId: number, answerText: string) {
  const [created] = await db
    .insert(exchangeAnswers)
    .values({ questionId, userId: user.id, answerText })
    .returning();

  await awardPoints(user.id, 5, 'exchange_answer', created.id);
  return created;
}

export async function getIncoming(user: UserDto) {
  const rows = await db
    .select({
      assignment: exchangeAssignments,
      question: exchangeQuestions,
    })
    .from(exchangeAssignments)
    .innerJoin(exchangeQuestions, eq(exchangeAssignments.questionId, exchangeQuestions.id))
    .where(
      and(
        eq(exchangeAssignments.assignedUserId, user.id),
        eq(exchangeAssignments.status, 'pending'),
      ),
    );

  return rows.map((r) => ({
    assignmentId: r.assignment.id,
    questionId: r.question.id,
    text: r.question.text,
    status: r.assignment.status,
  }));
}

export async function getQuestionWithAnswers(questionId: number, userId: number) {
  const [question] = await db
    .select()
    .from(exchangeQuestions)
    .where(eq(exchangeQuestions.id, questionId))
    .limit(1);

  if (!question) return null;

  const answers = await db
    .select()
    .from(exchangeAnswers)
    .where(eq(exchangeAnswers.questionId, questionId));

  return {
    question: {
      id: question.id,
      text: question.text,
      isMine: question.userId === userId,
    },
    answers: answers.map((a) => ({
      id: a.id,
      answerText: a.answerText,
      isMine: a.userId === userId,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function addReaction(user: UserDto, answerId: number, reactionType = 'like') {
  await db.insert(exchangeReactions).values({
    answerId,
    userId: user.id,
    reactionType,
  });
}

export async function skipAssignment(user: UserDto, assignmentId: number) {
  await db
    .update(exchangeAssignments)
    .set({ status: 'skipped' })
    .where(and(eq(exchangeAssignments.id, assignmentId), eq(exchangeAssignments.assignedUserId, user.id)));
}

export async function assignQuestion(questionId: number, assignedUserId: number) {
  const [existing] = await db
    .select({ id: exchangeAssignments.id })
    .from(exchangeAssignments)
    .where(
      and(
        eq(exchangeAssignments.questionId, questionId),
        eq(exchangeAssignments.assignedUserId, assignedUserId),
      ),
    )
    .limit(1);

  if (existing) return;

  await db.insert(exchangeAssignments).values({
    questionId,
    assignedUserId,
    status: 'pending',
  });
}

export async function assignRandomRespondents(
  questionId: number,
  authorId: number,
  scope: string,
  authorTrack: string | null,
  assignCount = 1,
): Promise<number> {
  const conditions = [ne(users.id, authorId)];

  if (scope === 'track' && authorTrack) {
    conditions.push(eq(users.track, authorTrack));
  }

  const candidates = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions));

  if (candidates.length === 0) return 0;

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(assignCount, shuffled.length));

  for (const user of picked) {
    await assignQuestion(questionId, user.id);
  }

  return picked.length;
}
