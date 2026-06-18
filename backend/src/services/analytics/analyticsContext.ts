import { eq } from 'drizzle-orm';
import { PARTICIPANT_ROLE } from '../../constants/roles.js';
import { db } from '../../db/index.js';
import {
  exchangeAnswers,
  exchangeQuestions,
  nfoDayReflections,
  pointsHistory,
  reflectionAnswers,
  stateCheckins,
  taskSubmissions,
  tasks,
  trainerSelfDiagnostics,
  userActivityLogs,
  users,
} from '../../db/schema.js';
import type { CheckinSettingsValue } from '../admin.service.js';
import { getCheckinSettings } from '../admin.service.js';
import type { ForumDayColumn } from './analytics.types.js';
import { getForumDayColumns } from './analyticsTime.js';

export interface AnalyticsContext {
  forumDays: ForumDayColumn[];
  checkinSettings: CheckinSettingsValue;
  participants: typeof users.$inferSelect[];
  activityLogs: { userId: number; action: string; createdAt: Date }[];
  checkins: typeof stateCheckins.$inferSelect[];
  reflectionAnswers: (typeof reflectionAnswers.$inferSelect & {
    questionType?: string;
  })[];
  nfoReflections: typeof nfoDayReflections.$inferSelect[];
  taskList: typeof tasks.$inferSelect[];
  submissions: typeof taskSubmissions.$inferSelect[];
  diagnostics: typeof trainerSelfDiagnostics.$inferSelect[];
  pointsRows: typeof pointsHistory.$inferSelect[];
  exchangeQuestions: typeof exchangeQuestions.$inferSelect[];
  exchangeAnswers: typeof exchangeAnswers.$inferSelect[];
}

let cachedContext: AnalyticsContext | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 30_000;

export async function loadAnalyticsContext(force = false): Promise<AnalyticsContext> {
  const now = Date.now();
  if (!force && cachedContext && now - cacheTime < CACHE_TTL_MS) {
    return cachedContext;
  }

  const [
    forumDays,
    checkinSettings,
    participants,
    activityLogs,
    checkins,
    reflectionAnswerRows,
    nfoReflections,
    taskList,
    submissions,
    diagnostics,
    pointsRows,
    exchangeQuestionRows,
    exchangeAnswerRows,
  ] = await Promise.all([
    getForumDayColumns(),
    getCheckinSettings(),
    db.select().from(users).where(eq(users.role, PARTICIPANT_ROLE)),
    db
      .select({
        userId: userActivityLogs.userId,
        action: userActivityLogs.action,
        createdAt: userActivityLogs.createdAt,
      })
      .from(userActivityLogs),
    db.select().from(stateCheckins),
    db.select().from(reflectionAnswers),
    db.select().from(nfoDayReflections),
    db.select().from(tasks),
    db.select().from(taskSubmissions),
    db.select().from(trainerSelfDiagnostics),
    db.select().from(pointsHistory),
    db.select().from(exchangeQuestions),
    db.select().from(exchangeAnswers),
  ]);

  cachedContext = {
    forumDays,
    checkinSettings,
    participants,
    activityLogs,
    checkins,
    reflectionAnswers: reflectionAnswerRows,
    nfoReflections,
    taskList,
    submissions,
    diagnostics,
    pointsRows,
    exchangeQuestions: exchangeQuestionRows,
    exchangeAnswers: exchangeAnswerRows,
  };
  cacheTime = now;
  return cachedContext;
}

export function clearAnalyticsCache(): void {
  cachedContext = null;
  cacheTime = 0;
}
