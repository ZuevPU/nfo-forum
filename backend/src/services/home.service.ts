import { and, asc, count, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  events,
  exchangeAnswers,
  exchangeQuestions,
  reflectionQuestions,
  feedbackMessages,
  taskSubmissions,
  tasks,
  trainerSelfDiagnostics,
  users,
} from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import type { EventDto } from './events.service.js';
import { isTrainerTrack } from './diagnostics.service.js';

export async function submitFeedback(userId: number, text: string) {
  await db.insert(feedbackMessages).values({
    userId,
    text,
  });
}

export interface HomeData {
  user: UserDto;
  currentEvent: EventDto | null;
  upcomingBlock: EventDto | null;
  trackRank: number;
  stats: {
    tasksAvailable: number;
    tasksCompleted: number;
    newExchangeAnswers: number;
    activeQuestions: number;
    activeExchange: number;
  };
  focusOfDay: {
    id: number;
    title: string;
  } | null;
  diagnostics: {
    available: boolean;
    completedBlocks: number;
    totalBlocks: number;
    isCompleted: boolean;
  };
}

function toEventDto(e: typeof events.$inferSelect): EventDto {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    place: e.place,
    track: e.track,
    isKeyBlock: e.isKeyBlock,
  };
}

function trackCondition(track?: string | null) {
  if (!track) return undefined;
  return or(eq(events.track, track), isNull(events.track));
}

export async function getHomeData(user: UserDto): Promise<HomeData> {
  const now = new Date();
  const trackFilter = trackCondition(user.track);

  const eventConditions = [gte(events.endTime, now)];
  if (trackFilter) eventConditions.push(trackFilter);
  const eventRows = await db
    .select()
    .from(events)
    .where(and(...eventConditions))
    .orderBy(asc(events.startTime));

  const currentEvent =
    eventRows.find((e) => e.startTime <= now && e.endTime >= now) ?? null;
  const upcomingBlock = eventRows.find((e) => e.isKeyBlock) ?? null;

  let trackRank = 0;
  if (user.track) {
    const trackUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.track, user.track))
      .orderBy(desc(users.points));
    const idx = trackUsers.findIndex((u) => u.id === user.id);
    trackRank = idx >= 0 ? idx + 1 : 0;
  }

  const [taskStats] = await db
    .select({
      tasksAvailable: sql<number>`(
        SELECT COUNT(*)::int FROM ${tasks}
        WHERE (${tasks.track} IS NULL OR ${tasks.track} = ${user.track ?? ''})
        AND ${tasks.isFocusOfDay} = false
      )`,
      tasksCompleted: sql<number>`(
        SELECT COUNT(*)::int FROM ${taskSubmissions}
        WHERE ${taskSubmissions.userId} = ${user.id} AND ${taskSubmissions.status} = 'approved'
      )`,
    })
    .from(tasks)
    .limit(1);

  const [answersResult] = await db
    .select({ value: count() })
    .from(exchangeAnswers)
    .innerJoin(exchangeQuestions, eq(exchangeAnswers.questionId, exchangeQuestions.id))
    .where(eq(exchangeQuestions.userId, user.id));
  const newAnswers = answersResult?.value ?? 0;

  const [activeQuestionsResult] = await db
    .select({ value: count() })
    .from(reflectionQuestions)
    .where(
      and(
        lte(reflectionQuestions.publishTime, now),
        or(isNull(reflectionQuestions.track), eq(reflectionQuestions.track, user.track ?? ''))
      )
    );
  const activeQuestions = activeQuestionsResult?.value ?? 0;

  const [activeExchangeResult] = await db
    .select({ value: count() })
    .from(exchangeQuestions)
    .where(eq(exchangeQuestions.status, 'published'));
  const activeExchange = activeExchangeResult?.value ?? 0;

  const [focusOfDay] = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.isFocusOfDay, true))
    .orderBy(desc(tasks.createdAt))
    .limit(1);

  const diagnosticsAvailable = await isTrainerTrack(user.track);
  const TOTAL_DIAGNOSTICS_BLOCKS = 9;
  let completedBlocks = 0;

  if (diagnosticsAvailable) {
    const latestAttempt = await db
      .select({ attemptNumber: trainerSelfDiagnostics.attemptNumber })
      .from(trainerSelfDiagnostics)
      .where(eq(trainerSelfDiagnostics.userId, user.id))
      .orderBy(desc(trainerSelfDiagnostics.attemptNumber))
      .limit(1);

    const attemptNumber = latestAttempt[0]?.attemptNumber ?? 1;
    const [progressResult] = await db
      .select({ value: count() })
      .from(trainerSelfDiagnostics)
      .where(
        and(
          eq(trainerSelfDiagnostics.userId, user.id),
          eq(trainerSelfDiagnostics.attemptNumber, attemptNumber),
        ),
      );
    completedBlocks = progressResult?.value ?? 0;
  }

  return {
    user,
    currentEvent: currentEvent ? toEventDto(currentEvent) : null,
    upcomingBlock: upcomingBlock ? toEventDto(upcomingBlock) : null,
    trackRank,
    stats: {
      tasksAvailable: taskStats?.tasksAvailable ?? 0,
      tasksCompleted: taskStats?.tasksCompleted ?? 0,
      newExchangeAnswers: newAnswers,
      activeQuestions,
      activeExchange,
    },
    focusOfDay: focusOfDay ?? null,
    diagnostics: {
      available: diagnosticsAvailable,
      completedBlocks,
      totalBlocks: TOTAL_DIAGNOSTICS_BLOCKS,
      isCompleted: completedBlocks >= TOTAL_DIAGNOSTICS_BLOCKS,
    },
  };
}
