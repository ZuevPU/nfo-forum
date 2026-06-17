import { and, asc, desc, eq, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  exchangeAnswers,
  exchangeAssignments,
  exchangeQuestions,
  exchangeReactions,
  exchangeReports,
  users,
} from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardPointsForSource } from './pointsConfig.service.js';
import { notifyUser } from './push.service.js';
import { entityLink } from '../utils/appLinks.js';

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

  await awardPointsForSource(user.id, 'exchange_question', created.id);
  return created;
}

export async function getFeed(user: UserDto, feedScope: 'all' | 'track' = 'all') {
  const now = new Date();
  const rows = await db
    .select({
      id: exchangeQuestions.id,
      text: exchangeQuestions.text,
      scope: exchangeQuestions.scope,
      userId: exchangeQuestions.userId,
      authorTrack: users.track,
      createdAt: exchangeQuestions.createdAt,
      publishTime: exchangeQuestions.publishTime,
      answerCount: sql<number>`count(${exchangeAnswers.id})::int`,
    })
    .from(exchangeQuestions)
    .leftJoin(exchangeAnswers, eq(exchangeAnswers.questionId, exchangeQuestions.id))
    .leftJoin(users, eq(exchangeQuestions.userId, users.id))
    .where(
      and(
        eq(exchangeQuestions.status, 'published'),
        or(isNull(exchangeQuestions.publishTime), lte(exchangeQuestions.publishTime, now)),
      ),
    )
    .groupBy(exchangeQuestions.id, users.track)
    .orderBy(desc(exchangeQuestions.publishTime));

  return rows
    .filter((q) => {
      if (feedScope === 'all') return q.scope === 'all';
      if (!user.track) return q.scope === 'all';
      return q.scope === 'all' || (q.scope === 'track' && q.authorTrack === user.track);
    })
    .map((q) => ({
      id: q.id,
      text: q.text,
      scope: q.scope,
      scopeLabel: q.scope === 'all' ? 'Все треки' : (q.authorTrack ?? 'Трек'),
      answerCount: Number(q.answerCount),
      isMine: q.userId === user.id,
      createdAt: (q.publishTime ?? q.createdAt).toISOString(),
    }));
}

export async function createAnswer(user: UserDto, questionId: number, answerText: string) {
  const [questionRow] = await db
    .select({
      question: exchangeQuestions,
      authorTrack: users.track,
    })
    .from(exchangeQuestions)
    .leftJoin(users, eq(exchangeQuestions.userId, users.id))
    .where(eq(exchangeQuestions.id, questionId))
    .limit(1);

  if (!questionRow?.question) throw new Error('Question not found');

  const question = questionRow.question;
  if (question.status !== 'published') throw new Error('Question is not available');

  const now = new Date();
  if (question.publishTime && question.publishTime > now) {
    throw new Error('Question is not available');
  }

  if (
    question.scope === 'track' &&
    questionRow.authorTrack &&
    user.track !== questionRow.authorTrack &&
    question.userId !== user.id
  ) {
    throw new Error('Question is not available for your track');
  }

  const [existingAnswer] = await db
    .select({ id: exchangeAnswers.id })
    .from(exchangeAnswers)
    .where(and(eq(exchangeAnswers.questionId, questionId), eq(exchangeAnswers.userId, user.id)))
    .limit(1);

  if (existingAnswer) throw new Error('Already answered');

  const [created] = await db
    .insert(exchangeAnswers)
    .values({ questionId, userId: user.id, answerText })
    .returning();

  await db
    .update(exchangeAssignments)
    .set({ status: 'completed' })
    .where(
      and(
        eq(exchangeAssignments.questionId, questionId),
        eq(exchangeAssignments.assignedUserId, user.id),
      ),
    );

  await awardPointsForSource(user.id, 'exchange_answer', created.id);

  if (question.userId !== user.id) {
    void notifyUser(
      question.userId,
      `Новый ответ на твой вопрос в «Обмене опытом»`,
      'exchange',
      entityLink('exchange', questionId),
      'Открыть вопрос',
    ).catch(console.error);
  }

  const [updatedQuestion] = await db
    .update(exchangeQuestions)
    .set({ answersCollectedNotifiedAt: new Date() })
    .where(
      and(
        eq(exchangeQuestions.id, questionId),
        isNull(exchangeQuestions.answersCollectedNotifiedAt),
        sql`(SELECT count(*)::int FROM exchange_answers WHERE question_id = ${questionId}) >= 3`,
      ),
    )
    .returning({ userId: exchangeQuestions.userId });

  if (updatedQuestion) {
    const [{ count: answerCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(exchangeAnswers)
      .where(eq(exchangeAnswers.questionId, questionId));
    void notifyUser(
      updatedQuestion.userId,
      `Собрано ${answerCount} ответа на твой вопрос в «Обмене опытом»!`,
      'exchange',
      entityLink('exchange', questionId),
      'Открыть вопрос',
    ).catch(console.error);
  }

  return created;
}

export async function markExchangeSeen(userId: number) {
  await db.update(users).set({ lastSeenExchangeAt: new Date() }).where(eq(users.id, userId));
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
        eq(exchangeQuestions.status, 'published'),
      ),
    );

  return rows.map((r) => ({
    assignmentId: r.assignment.id,
    questionId: r.question.id,
    text: r.question.text,
    status: r.assignment.status,
  }));
}

export async function getQuestionWithAnswers(questionId: number, user: UserDto) {
  const [questionRow] = await db
    .select({
      question: exchangeQuestions,
      authorTrack: users.track,
    })
    .from(exchangeQuestions)
    .leftJoin(users, eq(exchangeQuestions.userId, users.id))
    .where(eq(exchangeQuestions.id, questionId))
    .limit(1);

  if (!questionRow?.question) return null;

  const question = questionRow.question;
  if (question.status !== 'published') return null;

  const now = new Date();
  if (question.publishTime && question.publishTime > now) return null;

  if (
    question.scope === 'track' &&
    questionRow.authorTrack &&
    user.track !== questionRow.authorTrack &&
    question.userId !== user.id
  ) {
    return null;
  }

  const answers = await db
    .select({
      id: exchangeAnswers.id,
      answerText: exchangeAnswers.answerText,
      userId: exchangeAnswers.userId,
      createdAt: exchangeAnswers.createdAt,
      reactionCount: sql<number>`count(${exchangeReactions.id})::int`,
    })
    .from(exchangeAnswers)
    .leftJoin(exchangeReactions, eq(exchangeReactions.answerId, exchangeAnswers.id))
    .where(eq(exchangeAnswers.questionId, questionId))
    .groupBy(exchangeAnswers.id)
    .orderBy(asc(exchangeAnswers.createdAt));

  const myReactions = await db
    .select({ answerId: exchangeReactions.answerId })
    .from(exchangeReactions)
    .where(eq(exchangeReactions.userId, user.id));

  const likedSet = new Set(myReactions.map((r) => r.answerId));
  const publishTime = question.publishTime ?? question.createdAt;

  return {
    question: {
      id: question.id,
      text: question.text,
      isMine: question.userId === user.id,
      scope: question.scope,
      scopeLabel: question.scope === 'all' ? 'Все треки' : (questionRow.authorTrack ?? 'Трек'),
      publishTime: publishTime.toISOString(),
    },
    answers: answers.map((a) => ({
      id: a.id,
      answerText: a.answerText,
      isMine: a.userId === user.id,
      createdAt: a.createdAt.toISOString(),
      reactionCount: Number(a.reactionCount),
      likedByMe: likedSet.has(a.id),
    })),
  };
}

export async function addReaction(user: UserDto, answerId: number, reactionType = 'like') {
  const [existing] = await db
    .select({ id: exchangeReactions.id })
    .from(exchangeReactions)
    .where(and(eq(exchangeReactions.answerId, answerId), eq(exchangeReactions.userId, user.id)))
    .limit(1);

  if (existing) return { ok: true, already: true };

  await db.insert(exchangeReactions).values({
    answerId,
    userId: user.id,
    reactionType,
  });
  return { ok: true, already: false };
}

export async function reportAnswer(user: UserDto, answerId: number) {
  const [answer] = await db
    .select({ id: exchangeAnswers.id })
    .from(exchangeAnswers)
    .where(eq(exchangeAnswers.id, answerId))
    .limit(1);
  if (!answer) throw new Error('Answer not found');

  const [existing] = await db
    .select({ id: exchangeReports.id })
    .from(exchangeReports)
    .where(
      and(eq(exchangeReports.answerId, answerId), eq(exchangeReports.reporterUserId, user.id)),
    )
    .limit(1);
  if (existing) return { ok: true, already: true };

  await db.insert(exchangeReports).values({
    answerId,
    reporterUserId: user.id,
  });
  return { ok: true, already: false };
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

export async function getExchangeActivity() {
  const rows = await db
    .select({
      id: exchangeQuestions.id,
      text: exchangeQuestions.text,
      status: exchangeQuestions.status,
      answerCount: sql<number>`count(${exchangeAnswers.id})::int`,
      assignmentCount: sql<number>`(
        SELECT count(*)::int FROM exchange_assignments ea
        WHERE ea.question_id = ${exchangeQuestions.id}
      )`,
    })
    .from(exchangeQuestions)
    .leftJoin(exchangeAnswers, eq(exchangeAnswers.questionId, exchangeQuestions.id))
    .groupBy(exchangeQuestions.id)
    .orderBy(desc(exchangeQuestions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    status: r.status,
    answerCount: Number(r.answerCount),
    assignmentCount: Number(r.assignmentCount),
  }));
}

export async function assignRandomRespondents(
  questionId: number,
  authorId: number,
  scope: string,
  authorTrack: string | null,
  assignCount = 5,
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
    void notifyUser(
      user.id,
      'Тебе назначен вопрос для «Обмена опытом»! Открой раздел и ответь.',
      'exchange',
      entityLink('exchange'),
      'Открыть обмен',
    ).catch(console.error);
  }

  return picked.length;
}
