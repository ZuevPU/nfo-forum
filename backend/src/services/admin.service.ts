import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  broadcasts,
  diagnosticProfileFeedback,
  events,
  exchangeQuestions,
  pointsHistory,
  reflectionQuestions,
  systemSettings,
  taskSubmissions,
  tasks,
  trainerSelfDiagnostics,
  users,
  nfoDayReflections,
  reflectionAnswers,
  userActivityLogs,
} from '../db/schema.js';
import { normalizePhotoUrls } from '../utils/mediaUrls.js';
import { awardPoints } from './points.service.js';
import { userAlreadyAwardedForTask } from './tasks.service.js';
import { notifyUser, notifyUsersForTrack } from './push.service.js';
import { assignRandomRespondents } from './exchange.service.js';
import { entityLink } from '../utils/appLinks.js';
import { DIAGNOSTICS_DATA } from '../data/samodiagnostika.js';
import { DEFAULT_NFO_DAY_QUESTIONS } from '../constants/nfoFactors.js';
import { DEFAULT_INSIGHTS_SETTINGS, type InsightsSettings } from '../constants/insights.js';
import type { PointsConfigValue } from '../constants/pointsSystem.js';
import { DEFAULT_POINTS_CONFIG } from '../constants/pointsSystem.js';

export async function listBroadcasts() {
  return db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt));
}

export async function listEvents() {
  return db.select().from(events).orderBy(events.startTime);
}

export async function createEvent(data: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  place?: string;
  track?: string | null;
  isKeyBlock?: boolean;
}) {
  const [row] = await db
    .insert(events)
    .values({
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      place: data.place,
      track: data.track ?? null,
      isKeyBlock: data.isKeyBlock ?? false,
    })
    .returning();
  return row;
}

export async function updateEvent(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    place: string;
    track: string | null;
    isKeyBlock: boolean;
  }>,
) {
  const [row] = await db
    .update(events)
    .set({
      ...(data.title != null ? { title: data.title } : {}),
      ...(data.description != null ? { description: data.description } : {}),
      ...(data.startTime != null ? { startTime: new Date(data.startTime) } : {}),
      ...(data.endTime != null ? { endTime: new Date(data.endTime) } : {}),
      ...(data.place != null ? { place: data.place } : {}),
      ...(data.track !== undefined ? { track: data.track } : {}),
      ...(data.isKeyBlock != null ? { isKeyBlock: data.isKeyBlock } : {}),
    })
    .where(eq(events.id, id))
    .returning();
  return row ?? null;
}

export async function deleteEvent(id: number) {
  await db.delete(events).where(eq(events.id, id));
}

export async function listTasks() {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function createTask(data: {
  title: string;
  description: string;
  points?: number;
  track?: string | null;
  autoApprove?: boolean;
  allowMultiple?: boolean;
  deadline?: string | null;
  requiresPhoto?: boolean;
  photoMode?: 'none' | 'optional' | 'required';
  sendNotification?: boolean;
  isFocusOfDay?: boolean;
  isRandomDistribution?: boolean;
  networkingContacts?: number;
  publishTime?: string | null;
  asDraft?: boolean;
}) {
  const now = new Date();
  const photoMode = data.photoMode ?? (data.requiresPhoto ? 'required' : 'none');
  let status: 'draft' | 'scheduled' | 'published' = 'published';
  let publishTime: Date | null = now;

  if (data.asDraft || !data.publishTime) {
    status = 'draft';
    publishTime = null;
  } else {
    publishTime = new Date(data.publishTime);
    status = publishTime > now ? 'scheduled' : 'published';
  }

  const [row] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description,
      points: data.points ?? 20,
      track: data.track ?? null,
      autoApprove: data.autoApprove ?? false,
      allowMultiple: data.allowMultiple ?? false,
      deadline: data.deadline ? new Date(data.deadline) : null,
      requiresPhoto: photoMode === 'required',
      photoMode,
      status,
      publishTime,
      sendNotification: data.sendNotification ?? true,
      isFocusOfDay: data.isFocusOfDay ?? false,
      isRandomDistribution: data.isRandomDistribution ?? false,
      networkingContacts: data.isRandomDistribution
        ? Math.max(1, data.networkingContacts ?? 1)
        : 1,
    })
    .returning();

  if (row.sendNotification && row.status === 'published') {
    void notifyUsersForTrack(
      row.track,
      `Новое задание: «${row.title}»`,
      'tasks',
      entityLink('tasks', row.id),
      'Открыть задание',
    ).catch(console.error);
  }

  return row;
}

export async function updateTask(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    points: number;
    track: string | null;
    allowMultiple: boolean;
    deadline: string | null;
    requiresPhoto: boolean;
    photoMode: 'none' | 'optional' | 'required';
    sendNotification: boolean;
    isFocusOfDay: boolean;
    isRandomDistribution: boolean;
    autoApprove: boolean;
    publishTime: string | null;
    status: 'draft' | 'scheduled' | 'published';
  }>,
) {
  const patch: Record<string, unknown> = { ...data };
  if (data.deadline !== undefined) {
    patch.deadline = data.deadline ? new Date(data.deadline) : null;
  }
  if (data.publishTime !== undefined) {
    patch.publishTime = data.publishTime ? new Date(data.publishTime) : null;
  }
  if (data.photoMode) {
    patch.photoMode = data.photoMode;
    patch.requiresPhoto = data.photoMode === 'required';
  }
  const [row] = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning();
  return row ?? null;
}

export async function publishTask(id: number) {
  const now = new Date();
  const [row] = await db
    .update(tasks)
    .set({ status: 'published', publishTime: now })
    .where(eq(tasks.id, id))
    .returning();
  if (!row) return null;

  if (row.sendNotification) {
    void notifyUsersForTrack(
      row.track,
      `Новое задание: «${row.title}»`,
      'tasks',
      entityLink('tasks', row.id),
      'Открыть задание',
    ).catch(console.error);
  }
  return row;
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function listPendingExchangeQuestions() {
  return db
    .select({
      id: exchangeQuestions.id,
      text: exchangeQuestions.text,
      status: exchangeQuestions.status,
      scope: exchangeQuestions.scope,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorTrack: users.track,
    })
    .from(exchangeQuestions)
    .innerJoin(users, eq(exchangeQuestions.userId, users.id))
    .where(eq(exchangeQuestions.status, 'pending'))
    .orderBy(desc(exchangeQuestions.createdAt));
}

export async function deleteExchangeQuestion(id: number) {
  const deleted = await db
    .delete(exchangeQuestions)
    .where(eq(exchangeQuestions.id, id))
    .returning({ id: exchangeQuestions.id });
  return deleted.length > 0;
}

export async function hideExchangeQuestion(id: number) {
  const [row] = await db
    .update(exchangeQuestions)
    .set({ status: 'hidden' })
    .where(and(eq(exchangeQuestions.id, id), eq(exchangeQuestions.status, 'published')))
    .returning();
  return row ?? null;
}

export async function moderateExchangeQuestion(id: number, status: 'approved' | 'rejected', publishTime?: string) {
  const [existing] = await db
    .select()
    .from(exchangeQuestions)
    .where(eq(exchangeQuestions.id, id))
    .limit(1);

  if (!existing) return null;

  const newStatus = status === 'approved' ? 'published' : 'rejected';

  const [row] = await db
    .update(exchangeQuestions)
    .set({
      status: newStatus,
      publishTime: status === 'approved' ? (publishTime ? new Date(publishTime) : new Date()) : null,
    })
    .where(eq(exchangeQuestions.id, id))
    .returning();

  if (status === 'approved' && row) {
    const [author] = await db
      .select({ track: users.track })
      .from(users)
      .where(eq(users.id, existing.userId))
      .limit(1);

    const { awardAction } = await import('./pointsEngine.service.js');
    await awardAction(existing.userId, 'exchange_question', row.id, { skipIfSourceIdExists: true });

    await assignRandomRespondents(
      row.id,
      existing.userId,
      existing.scope,
      author?.track ?? null,
    );
  }

  return row ?? null;
}

export async function listPendingSubmissions() {
  const rows = await db
    .select({
      id: taskSubmissions.id,
      taskId: taskSubmissions.taskId,
      userId: taskSubmissions.userId,
      answerText: taskSubmissions.answerText,
      photos: taskSubmissions.photos,
      status: taskSubmissions.status,
      createdAt: taskSubmissions.createdAt,
      taskTitle: tasks.title,
      userName: users.firstName,
      userLastName: users.lastName,
      userTrack: users.track,
    })
    .from(taskSubmissions)
    .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
    .innerJoin(users, eq(taskSubmissions.userId, users.id))
    .where(eq(taskSubmissions.status, 'pending'))
    .orderBy(desc(taskSubmissions.createdAt));

  return rows.map((row) => ({
    ...row,
    photos: normalizePhotoUrls(row.photos),
  }));
}

export async function listTaskSubmissions(taskId: number) {
  const rows = await db
    .select({
      id: taskSubmissions.id,
      taskId: taskSubmissions.taskId,
      userId: taskSubmissions.userId,
      answerText: taskSubmissions.answerText,
      photos: taskSubmissions.photos,
      status: taskSubmissions.status,
      adminComment: taskSubmissions.adminComment,
      createdAt: taskSubmissions.createdAt,
      updatedAt: taskSubmissions.updatedAt,
      userName: users.firstName,
      userLastName: users.lastName,
      userTrack: users.track,
    })
    .from(taskSubmissions)
    .innerJoin(users, eq(taskSubmissions.userId, users.id))
    .where(eq(taskSubmissions.taskId, taskId))
    .orderBy(desc(taskSubmissions.createdAt));

  return rows.map((row) => ({
    ...row,
    photos: normalizePhotoUrls(row.photos),
  }));
}

export async function listAllTaskSubmissions(filters: {
  status?: 'pending' | 'approved' | 'rejected';
  taskId?: number;
  limit?: number;
} = {}) {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const conditions = [];
  if (filters.status) {
    conditions.push(eq(taskSubmissions.status, filters.status));
  }
  if (filters.taskId != null) {
    conditions.push(eq(taskSubmissions.taskId, filters.taskId));
  }

  const rows = await db
    .select({
      id: taskSubmissions.id,
      taskId: taskSubmissions.taskId,
      userId: taskSubmissions.userId,
      answerText: taskSubmissions.answerText,
      photos: taskSubmissions.photos,
      status: taskSubmissions.status,
      adminComment: taskSubmissions.adminComment,
      createdAt: taskSubmissions.createdAt,
      updatedAt: taskSubmissions.updatedAt,
      taskTitle: tasks.title,
      userName: users.firstName,
      userLastName: users.lastName,
      userTrack: users.track,
    })
    .from(taskSubmissions)
    .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
    .innerJoin(users, eq(taskSubmissions.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(taskSubmissions.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    photos: normalizePhotoUrls(row.photos),
  }));
}

export async function moderateSubmission(
  id: number,
  status: 'approved' | 'rejected',
  adminComment?: string,
) {
  const [row] = await db
    .update(taskSubmissions)
    .set({ status, adminComment, updatedAt: new Date() })
    .where(eq(taskSubmissions.id, id))
    .returning();

  if (!row || status !== 'approved') {
    if (row && status === 'rejected') {
      void notifyUser(
        row.userId,
        adminComment
          ? `Задание не принято: ${adminComment}`
          : 'Задание не принято. Попробуй отправить снова.',
        'tasks',
        entityLink('tasks', row.taskId),
        'Открыть задание',
      ).catch(console.error);
    }
    return row ?? null;
  }

  const [task] = await db.select().from(tasks).where(eq(tasks.id, row.taskId)).limit(1);
  if (!task) return row;

  const [existingPoints] = await db
    .select({ id: pointsHistory.id })
    .from(pointsHistory)
    .where(
      and(eq(pointsHistory.source, 'task_submission'), eq(pointsHistory.sourceId, row.id)),
    )
    .limit(1);

  if (!existingPoints) {
    const alreadyAwarded = await userAlreadyAwardedForTask(row.userId, row.taskId);
    if (task.allowMultiple || !alreadyAwarded) {
      await awardPoints(row.userId, task.points, 'task_submission', row.id, undefined, 0, task.points);
    }
  }

  void notifyUser(
    row.userId,
    adminComment
      ? `Задание принято! ${adminComment}`
      : `Задание «${task.title}» принято! +${task.points} баллов`,
    'tasks',
    entityLink('tasks', row.taskId),
    'Открыть задание',
  ).catch(console.error);

  return row;
}

export async function listReflectionQuestions() {
  return db.select().from(reflectionQuestions).orderBy(reflectionQuestions.publishTime);
}

export async function createReflectionQuestion(data: {
  text: string;
  type: string;
  publishTime?: string | null;
  endTime?: string | null;
  points?: number;
  sendNotification?: boolean;
  groupId?: string | null;
  track?: string | null;
  allowMultiple?: boolean;
  asDraft?: boolean;
}) {
  const now = new Date();
  let status: 'draft' | 'scheduled' | 'published' = 'published';
  let publishTime: Date | null = now;

  if (data.asDraft || !data.publishTime) {
    status = 'draft';
    publishTime = null;
  } else {
    publishTime = new Date(data.publishTime);
    status = publishTime > now ? 'scheduled' : 'published';
  }

  const [row] = await db
    .insert(reflectionQuestions)
    .values({
      text: data.text,
      type: data.type,
      status,
      publishTime,
      endTime: data.endTime ? new Date(data.endTime) : null,
      points: data.points ?? 10,
      sendNotification: data.sendNotification ?? true,
      groupId: data.groupId ?? null,
      track: data.track ?? null,
      allowMultiple: data.allowMultiple ?? false,
    })
    .returning();

  if (row.sendNotification && row.status === 'published' && row.publishTime && row.publishTime <= now) {
    void notifyUsersForTrack(
      row.track,
      `Новый вопрос для рефлексии: ${row.text.slice(0, 80)}${row.text.length > 80 ? '…' : ''}`,
      'questions',
      entityLink('questions', row.id),
      'Открыть вопрос',
    ).catch(console.error);
    await db
      .update(reflectionQuestions)
      .set({ notificationSentAt: now })
      .where(eq(reflectionQuestions.id, row.id));
  }

  return row;
}

export async function publishReflectionQuestion(id: number) {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(reflectionQuestions)
    .where(eq(reflectionQuestions.id, id))
    .limit(1);
  if (!existing) return null;

  const [row] = await db
    .update(reflectionQuestions)
    .set({ status: 'published', publishTime: now })
    .where(eq(reflectionQuestions.id, id))
    .returning();

  if (row?.sendNotification && !row.notificationSentAt) {
    void notifyUsersForTrack(
      row.track,
      `Новый вопрос для рефлексии: ${row.text.slice(0, 80)}${row.text.length > 80 ? '…' : ''}`,
      'questions',
      entityLink('questions', row.id),
      'Открыть вопрос',
    ).catch(console.error);
    await db
      .update(reflectionQuestions)
      .set({ notificationSentAt: now })
      .where(eq(reflectionQuestions.id, id));
  }

  return row ?? null;
}

export async function updateReflectionQuestion(
  id: number,
  data: Partial<{
    text: string;
    type: string;
    publishTime: string | null;
    endTime: string | null;
    points: number;
    sendNotification: boolean;
    groupId: string | null;
    track: string | null;
    allowMultiple: boolean;
    status: 'draft' | 'scheduled' | 'published';
  }>,
) {
  const patch: Record<string, unknown> = { ...data };
  if (data.publishTime !== undefined) {
    patch.publishTime = data.publishTime ? new Date(data.publishTime) : null;
  }
  if (data.endTime !== undefined) patch.endTime = data.endTime ? new Date(data.endTime) : null;
  const [row] = await db
    .update(reflectionQuestions)
    .set(patch)
    .where(eq(reflectionQuestions.id, id))
    .returning();
  return row ?? null;
}

export async function listDiagnosticProfileFeedback() {
  return db
    .select({
      id: diagnosticProfileFeedback.id,
      userId: diagnosticProfileFeedback.userId,
      userName: users.firstName,
      userLastName: users.lastName,
      track: users.track,
      attemptNumber: diagnosticProfileFeedback.attemptNumber,
      comment: diagnosticProfileFeedback.comment,
      createdAt: diagnosticProfileFeedback.createdAt,
    })
    .from(diagnosticProfileFeedback)
    .innerJoin(users, eq(diagnosticProfileFeedback.userId, users.id))
    .orderBy(desc(diagnosticProfileFeedback.createdAt));
}

export async function listReflectionAnswers(track?: string, day?: string) {
  const rows = await db
    .select({
      id: reflectionAnswers.id,
      answerText: reflectionAnswers.answerText,
      createdAt: reflectionAnswers.createdAt,
      questionText: reflectionQuestions.text,
      questionType: reflectionQuestions.type,
      userName: users.firstName,
      userLastName: users.lastName,
      track: users.track,
    })
    .from(reflectionAnswers)
    .innerJoin(reflectionQuestions, eq(reflectionAnswers.questionId, reflectionQuestions.id))
    .innerJoin(users, eq(reflectionAnswers.userId, users.id))
    .orderBy(desc(reflectionAnswers.createdAt));

  return rows.filter((r) => {
    if (track && r.track !== track) return false;
    if (day && !r.createdAt.toISOString().startsWith(day)) return false;
    return true;
  });
}

export async function getNfoDayStats() {
  const rows = await db
    .select({
      answerText: nfoDayReflections.answerText,
      factors: nfoDayReflections.factors,
      date: nfoDayReflections.date,
      userName: users.firstName,
      track: users.track,
    })
    .from(nfoDayReflections)
    .innerJoin(users, eq(nfoDayReflections.userId, users.id))
    .orderBy(desc(nfoDayReflections.createdAt));

  const factorCounts: Record<string, number> = {};
  for (const r of rows) {
    for (const f of r.factors) {
      factorCounts[f] = (factorCounts[f] ?? 0) + 1;
    }
  }

  return { answers: rows, factorCounts };
}

const DEFAULT_CHECKIN_EMOTIONS = [
  'тревога',
  'растерянность',
  'скука',
  'раздражение',
  'усталость',
  'спокойствие',
  'интерес',
  'вовлечённость',
  'воодушевление',
  'радость',
  'гордость',
];

export type CheckinIntervalSetting = { start: string; end: string; label?: string };

export type CheckinDayConfig = {
  slots: string[];
  intervals?: CheckinIntervalSetting[];
};

export type CheckinSettingsValue = {
  enabledTracks: string[];
  slots: string[];
  intervals?: CheckinIntervalSetting[];
  byDay?: Partial<Record<'1' | '2' | '3' | '4', CheckinDayConfig>>;
  title: string;
  subtitle: string;
  emotions: string[];
  energyLabel: string;
  energyLowLabel: string;
  energyMidLabel: string;
  energyHighLabel: string;
  emotionLabel: string;
  commentPlaceholder: string;
  windowMinutes: number;
};

const DEFAULT_DAY_SLOTS = ['08:30', '13:15', '19:30'];

function normalizeCheckinSettings(raw: Partial<CheckinSettingsValue>): CheckinSettingsValue {
  const emotions = Array.isArray(raw.emotions)
    ? raw.emotions.filter((e) => typeof e === 'string' && e.trim()).map((e) => e.trim())
    : [...DEFAULT_CHECKIN_EMOTIONS];
  const intervals = Array.isArray(raw.intervals)
    ? raw.intervals.filter((i) => i?.start && i?.end)
    : undefined;
  const legacySlots = Array.isArray(raw.slots) && raw.slots.length ? raw.slots : DEFAULT_DAY_SLOTS;
  const byDay = raw.byDay ?? {
    '1': { slots: ['08:30', '19:30'] },
    '2': { slots: legacySlots, intervals: intervals?.length ? intervals : undefined },
    '3': { slots: legacySlots, intervals: intervals?.length ? intervals : undefined },
    '4': { slots: legacySlots },
  };

  return {
    enabledTracks: Array.isArray(raw.enabledTracks) ? raw.enabledTracks : [],
    slots: legacySlots,
    intervals: intervals?.length ? intervals : undefined,
    byDay,
    title: raw.title?.trim() || 'Как ты сейчас?',
    subtitle: raw.subtitle?.trim() || '30 секунд',
    emotions: emotions.length ? emotions : [...DEFAULT_CHECKIN_EMOTIONS],
    energyLabel: raw.energyLabel?.trim() || 'Энергия (0-10)',
    energyLowLabel: raw.energyLowLabel?.trim() || 'еле держусь',
    energyMidLabel: raw.energyMidLabel?.trim() || 'нормально',
    energyHighLabel: raw.energyHighLabel?.trim() || 'заряжен',
    emotionLabel: raw.emotionLabel?.trim() || 'Настроение',
    commentPlaceholder: raw.commentPlaceholder?.trim() || 'Моё состояние вызвано тем, что...',
    windowMinutes: typeof raw.windowMinutes === 'number' && raw.windowMinutes > 0 ? raw.windowMinutes : 120,
  };
}

export function resolveCheckinSettingsForDay(
  settings: CheckinSettingsValue,
  programDay: number | null,
): CheckinSettingsValue {
  if (!programDay) return settings;
  const dayKey = String(programDay) as '1' | '2' | '3' | '4';
  const dayConfig = settings.byDay?.[dayKey];
  if (!dayConfig) return settings;
  return {
    ...settings,
    slots: dayConfig.slots.length ? dayConfig.slots : settings.slots,
    intervals: dayConfig.intervals?.length ? dayConfig.intervals : settings.intervals,
  };
}

export async function getCheckinSettings(): Promise<CheckinSettingsValue> {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'checkin_settings'))
    .limit(1);
  if (setting?.value && typeof setting.value === 'object') {
    return normalizeCheckinSettings(setting.value as Partial<CheckinSettingsValue>);
  }
  return normalizeCheckinSettings({});
}

export async function setCheckinSettings(value: Partial<CheckinSettingsValue> & {
  enabledTracks: string[];
  slots: string[];
}) {
  const normalized = normalizeCheckinSettings(value);
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'checkin_settings'))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: normalized, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'checkin_settings', value: normalized });
  }
}

export async function getExchangeSlotSettings() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'exchange_slots'))
    .limit(1);
  return (setting?.value as string[]) ?? [];
}

export async function getInsightsSettings(): Promise<InsightsSettings> {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'insights_settings'))
    .limit(1);
  const value = (setting?.value ?? {}) as Partial<InsightsSettings>;
  return {
    prompt: value.prompt?.trim() || DEFAULT_INSIGHTS_SETTINGS.prompt,
    placeholder: value.placeholder?.trim() || DEFAULT_INSIGHTS_SETTINGS.placeholder,
  };
}

export async function setInsightsSettings(data: InsightsSettings) {
  const normalized: InsightsSettings = {
    prompt: data.prompt.trim() || DEFAULT_INSIGHTS_SETTINGS.prompt,
    placeholder: data.placeholder.trim() || DEFAULT_INSIGHTS_SETTINGS.placeholder,
  };
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'insights_settings'))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: normalized, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'insights_settings', value: normalized });
  }
  return normalized;
}

export async function setExchangeSlotSettings(slots: string[]) {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'exchange_slots'))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: slots, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'exchange_slots', value: slots });
  }
}

export async function getPushMascotMediaId(): Promise<string | undefined> {
  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'push_mascot_media_id'))
    .limit(1);
  if (!row?.value) return undefined;
  if (typeof row.value === 'string') return row.value;
  if (typeof row.value === 'object' && row.value && 'id' in row.value) {
    return String((row.value as { id: string }).id);
  }
  return undefined;
}

export async function getNfoDaySettings() {
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
    closeHour?: number;
    closeMinute?: number;
  };
  const questions =
    Array.isArray(value.questions) && value.questions.length > 0
      ? value.questions
      : DEFAULT_NFO_DAY_QUESTIONS;
  return {
    publishHour: value.publishHour ?? 19,
    publishMinute: value.publishMinute ?? 30,
    points: value.points ?? 10,
    question: value.question ?? '',
    panelTitle: value.panelTitle ?? '',
    panelSubtitle: value.panelSubtitle ?? '',
    factors: value.factors ?? [],
    questions,
    closeHour: value.closeHour ?? null,
    closeMinute: value.closeMinute ?? null,
  };
}

export async function setNfoDaySettings(value: {
  publishHour?: number;
  publishMinute?: number;
  closeHour?: number | null;
  closeMinute?: number | null;
  points?: number;
  question?: string;
  panelTitle?: string;
  panelSubtitle?: string;
  factors?: string[];
  questions?: typeof DEFAULT_NFO_DAY_QUESTIONS;
}) {
  const current = await getNfoDaySettings();
  const merged = {
    publishHour: value.publishHour ?? current.publishHour,
    publishMinute: value.publishMinute ?? current.publishMinute,
    closeHour: value.closeHour !== undefined ? value.closeHour : current.closeHour,
    closeMinute: value.closeMinute !== undefined ? value.closeMinute : current.closeMinute,
    points: value.points ?? current.points,
    question: value.question !== undefined ? value.question : current.question,
    panelTitle: value.panelTitle !== undefined ? value.panelTitle : current.panelTitle,
    panelSubtitle: value.panelSubtitle !== undefined ? value.panelSubtitle : current.panelSubtitle,
    factors: value.factors !== undefined ? value.factors : current.factors,
    questions: value.questions !== undefined ? value.questions : current.questions,
  };

  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'nfo_day_config'))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: merged, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'nfo_day_config', value: merged });
  }

  return merged;
}

export async function getDailyFocusSettings(): Promise<{ title: string; taskId: number | null }> {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'daily_focus'))
    .limit(1);
  const value = (setting?.value ?? {}) as { title?: string; taskId?: number };
  return { title: value.title ?? '', taskId: value.taskId ?? null };
}

export async function setDailyFocusSettings(title: string, taskId?: number | null) {
  const value = { title, taskId: taskId ?? null };
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'daily_focus'))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'daily_focus', value });
  }
}

export async function listActivityLogs(limit = 200) {
  return db
    .select({
      id: userActivityLogs.id,
      action: userActivityLogs.action,
      createdAt: userActivityLogs.createdAt,
      userName: users.firstName,
      track: users.track,
    })
    .from(userActivityLogs)
    .innerJoin(users, eq(userActivityLogs.userId, users.id))
    .orderBy(desc(userActivityLogs.createdAt))
    .limit(limit);
}

export async function deleteReflectionQuestion(id: number) {
  const deleted = await db
    .delete(reflectionQuestions)
    .where(eq(reflectionQuestions.id, id))
    .returning({ id: reflectionQuestions.id });
  return deleted.length > 0;
}

// Diagnostics
export async function getDiagnosticsSettings() {
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

export async function setDiagnosticsSettings(tracks: string[]) {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'diagnostics_enabled_tracks'))
    .limit(1);

  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: tracks, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db
      .insert(systemSettings)
      .values({ key: 'diagnostics_enabled_tracks', value: tracks });
  }
}

export async function getDiagnosticsResults() {
  const results = await db
    .select({
      id: trainerSelfDiagnostics.id,
      userId: trainerSelfDiagnostics.userId,
      blockId: trainerSelfDiagnostics.blockId,
      questionId: trainerSelfDiagnostics.questionId,
      score: trainerSelfDiagnostics.score,
      attemptNumber: trainerSelfDiagnostics.attemptNumber,
      comment: trainerSelfDiagnostics.comment,
      createdAt: trainerSelfDiagnostics.createdAt,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
        track: users.track,
      }
    })
    .from(trainerSelfDiagnostics)
    .leftJoin(users, eq(trainerSelfDiagnostics.userId, users.id))
    .orderBy(desc(trainerSelfDiagnostics.createdAt));
    
  return results;
}

export async function generateDiagnosticsCSV(): Promise<string> {
  const results = await getDiagnosticsResults();
  
  const headers = [
    'ID',
    'Имя',
    'Фамилия',
    'Трек',
    'Блок (ID)',
    'Название навыка',
    'Оценка',
    'Попытка',
    'Комментарий',
    'Дата'
  ];
  
  const rows = results.map(r => {
    const skill = DIAGNOSTICS_DATA.skills.find(s => s.id === r.blockId);
    return [
      r.id,
      r.user?.firstName ?? '',
      r.user?.lastName ?? '',
      r.user?.track ?? '',
      r.blockId,
      skill?.title ?? '',
      r.score,
      r.attemptNumber,
      r.comment ?? '',
      new Date(r.createdAt).toISOString()
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

export async function getPointsSettings(): Promise<PointsConfigValue> {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'points_config'))
    .limit(1);

  if (setting?.value && typeof setting.value === 'object') {
    const raw = setting.value as Record<string, unknown>;
    if (raw.rules && typeof raw.rules === 'object') {
      return { rules: raw.rules as PointsConfigValue['rules'] };
    }
  }

  return { ...DEFAULT_POINTS_CONFIG };
}

export async function setPointsSettings(config: PointsConfigValue) {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'points_config'))
    .limit(1);

  const value: PointsConfigValue = {
    rules: config.rules ?? {},
  };

  if (existing) {
    await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'points_config', value });
  }
}
