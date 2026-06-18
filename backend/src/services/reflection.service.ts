import { and, asc, desc, eq, isNotNull, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { DEFAULT_NFO_DAY_QUESTIONS, NFO_DAY_FACTORS, NFO_DAY_PANEL_SUBTITLE, NFO_DAY_PANEL_TITLE, NFO_DAY_QUESTION } from '../constants/nfoFactors.js';
import { nfoDayReflections, pointsHistory, programInsights, reflectionAnswers, reflectionQuestions, systemSettings } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { moscowDateString } from '../utils/moscowTime.js';
import { isNfoDayTimeOpen } from '../utils/slotMatching.js';
import { awardAction } from './pointsConfig.service.js';
import { INSIGHTS_QUESTION_GROUP_ID } from '../constants/insights.js';
import { resolveReflectionActionId } from '../constants/pointsSystem.js';

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
    .filter((q) => q.status !== 'draft')
    .filter((q) => q.publishTime != null && q.publishTime <= now)
    .filter((q) => !q.track || q.track === user.track)
    .filter((q) => !q.endTime || q.endTime > now)
    .filter((q) => q.groupId !== INSIGHTS_QUESTION_GROUP_ID && q.type !== 'insight')
    .map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      groupId: q.groupId,
      points: q.points,
      publishTime: q.publishTime!.toISOString(),
      endTime: q.endTime?.toISOString() ?? null,
      isLocked: false,
      isAnswered: answeredIds.has(q.id),
      allowMultiple: q.allowMultiple,
      unlockLabel: null,
    }));
}

export async function submitAnswer(user: UserDto, questionId: number, answerText: string) {
  const [question] = await db
    .select()
    .from(reflectionQuestions)
    .where(eq(reflectionQuestions.id, questionId))
    .limit(1);

  if (!question) throw new Error('Question not found');
  if (question.status === 'draft') throw new Error('Question is locked');
  if (!question.publishTime || question.publishTime > new Date()) throw new Error('Question is locked');

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

  const actionId = resolveReflectionActionId(question.type, question.groupId);
  await awardAction(user.id, actionId, created.id, {
    pointsOverride: question.points,
    skipIfSourceIdExists: true,
  });
  return created;
}

export async function getEveningQuestions(user: UserDto) {
  const now = new Date();
  const questions = await db
    .select()
    .from(reflectionQuestions)
    .where(
      and(
        eq(reflectionQuestions.type, 'evening'),
        eq(reflectionQuestions.status, 'published'),
        isNotNull(reflectionQuestions.publishTime),
        lte(reflectionQuestions.publishTime, now),
      ),
    )
    .orderBy(asc(reflectionQuestions.publishTime));

  return questions.filter((q) => !q.track || q.track === user.track);
}

export async function getNfoDayConfig() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'nfo_day_config'))
    .limit(1);

  const value = (setting?.value ?? {}) as {
    publishHour?: number;
    publishMinute?: number;
    points?: number;
    question?: string;
    panelTitle?: string;
    panelSubtitle?: string;
    factors?: string[];
    questions?: typeof DEFAULT_NFO_DAY_QUESTIONS;
  };
  const publishHour = value.publishHour ?? 19;
  const publishMinute = value.publishMinute ?? 30;
  const customFactors = Array.isArray(value.factors)
    ? value.factors.filter((f) => typeof f === 'string' && f.trim())
    : [];
  const questions =
    Array.isArray(value.questions) && value.questions.length > 0
      ? value.questions
      : DEFAULT_NFO_DAY_QUESTIONS;
  return {
    question: value.question?.trim() || NFO_DAY_QUESTION,
    questions,
    factors: customFactors.length > 0 ? customFactors : [...NFO_DAY_FACTORS],
    panelTitle: value.panelTitle?.trim() || NFO_DAY_PANEL_TITLE,
    panelSubtitle: value.panelSubtitle?.trim() || NFO_DAY_PANEL_SUBTITLE,
    publishHour,
    publishMinute,
    points: value.points ?? 10,
    isOpen: isNfoDayTimeOpen(publishHour, publishMinute),
  };
}

export type NfoDayResponses = {
  thesis?: string;
  understanding?: string;
  factors?: string[];
  extra?: string;
};

export async function submitNfoDayReflection(user: UserDto, responses: NfoDayResponses) {
  const thesis = responses.thesis?.trim() ?? '';
  const understanding = responses.understanding?.trim() ?? '';
  const factors = Array.isArray(responses.factors) ? responses.factors : [];
  const extra = responses.extra?.trim() ?? '';

  if (!thesis) throw new Error('Answer the first question');
  if (!understanding) throw new Error('Answer the second question');
  if (factors.length === 0 || factors.length > 3) {
    throw new Error('Select 1 to 3 factors');
  }

  const config = await getNfoDayConfig();
  const allowedFactors = new Set(config.factors);
  const invalid = factors.filter((f) => !allowedFactors.has(f));
  if (invalid.length > 0) throw new Error('Invalid factors');

  const today = moscowDateString();
  const [existing] = await db
    .select({ id: nfoDayReflections.id })
    .from(nfoDayReflections)
    .where(and(eq(nfoDayReflections.userId, user.id), eq(nfoDayReflections.date, today)))
    .limit(1);

  if (existing) throw new Error('Already submitted today');

  if (!isNfoDayTimeOpen(config.publishHour, config.publishMinute)) {
    throw new Error('NFO day reflection is not open yet');
  }

  const answersPayload = { thesis, understanding, factors, extra: extra || null };

  const [created] = await db
    .insert(nfoDayReflections)
    .values({
      userId: user.id,
      date: today,
      answerText: thesis,
      factors,
      answers: answersPayload,
    })
    .returning();

  const [existingThesis] = await db
    .select({ id: pointsHistory.id })
    .from(pointsHistory)
    .where(
      and(
        eq(pointsHistory.userId, user.id),
        eq(pointsHistory.source, 'nfo_thesis'),
        eq(pointsHistory.sourceId, created.id),
      ),
    )
    .limit(1);

  if (!existingThesis) {
    await awardAction(user.id, 'nfo_thesis', created.id, { skipIfSourceIdExists: true });
    await awardAction(user.id, 'nfo_understanding', created.id, { skipIfSourceIdExists: true });
    await awardAction(user.id, 'nfo_factors', created.id, { skipIfSourceIdExists: true });
    if (extra) {
      await awardAction(user.id, 'nfo_extra', created.id, { skipIfSourceIdExists: true });
    }
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

export async function getInsightsConfig() {
  const { getInsightsSettings } = await import('./admin.service.js');
  return getInsightsSettings();
}

export async function listProgramInsights(userId: number, limit = 20) {
  return db
    .select()
    .from(programInsights)
    .where(eq(programInsights.userId, userId))
    .orderBy(desc(programInsights.createdAt))
    .limit(limit);
}

export async function createProgramInsight(user: UserDto, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Text is required');

  const [created] = await db
    .insert(programInsights)
    .values({ userId: user.id, text: trimmed })
    .returning();

  const result = await awardAction(user.id, 'insight', created.id, { skipIfSourceIdExists: true });
  return { insight: created, pointsAwarded: result.awarded };
}
