import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  broadcasts,
  events,
  exchangeQuestions,
  pointsHistory,
  reflectionQuestions,
  systemSettings,
  taskSubmissions,
  tasks,
  trainerSelfDiagnostics,
  users,
} from '../db/schema.js';
import { assignRandomRespondents } from './exchange.service.js';
import { awardPoints } from './points.service.js';
import { notifyUser, notifyUsersForTrack } from './push.service.js';
import { entityLink } from '../utils/appLinks.js';
import { DIAGNOSTICS_DATA } from '../data/samodiagnostika.js';
import {
  nfoDayReflections,
  reflectionAnswers,
  userActivityLogs,
} from '../db/schema.js';

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
  sendNotification?: boolean;
  isFocusOfDay?: boolean;
  isRandomDistribution?: boolean;
}) {
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
      requiresPhoto: data.requiresPhoto ?? false,
      sendNotification: data.sendNotification ?? true,
      isFocusOfDay: data.isFocusOfDay ?? false,
      isRandomDistribution: data.isRandomDistribution ?? false,
    })
    .returning();

  if (row.sendNotification) {
    const now = new Date();
    const isImmediate = !row.deadline || row.deadline <= now;
    if (isImmediate) {
      void notifyUsersForTrack(
        row.track,
        `Новое задание: «${row.title}»`,
        'tasks',
        entityLink('tasks', row.id),
        'Открыть задание',
      ).catch(console.error);
    }
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
    sendNotification: boolean;
    isFocusOfDay: boolean;
    isRandomDistribution: boolean;
    autoApprove: boolean;
  }>,
) {
  const patch: Record<string, unknown> = { ...data };
  if (data.deadline !== undefined) {
    patch.deadline = data.deadline ? new Date(data.deadline) : null;
  }
  const [row] = await db.update(tasks).set(patch).where(eq(tasks.id, id)).returning();
  return row ?? null;
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function listPendingExchangeQuestions() {
  return db
    .select()
    .from(exchangeQuestions)
    .where(eq(exchangeQuestions.status, 'pending'))
    .orderBy(desc(exchangeQuestions.createdAt));
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
  return db
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
    })
    .from(taskSubmissions)
    .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
    .innerJoin(users, eq(taskSubmissions.userId, users.id))
    .where(eq(taskSubmissions.status, 'pending'))
    .orderBy(desc(taskSubmissions.createdAt));
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
    await awardPoints(row.userId, task.points, 'task_submission', row.id);
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
  publishTime: string;
  endTime?: string | null;
  points?: number;
  sendNotification?: boolean;
  groupId?: string | null;
  track?: string | null;
  allowMultiple?: boolean;
}) {
  const [row] = await db
    .insert(reflectionQuestions)
    .values({
      text: data.text,
      type: data.type,
      publishTime: new Date(data.publishTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      points: data.points ?? 10,
      sendNotification: data.sendNotification ?? true,
      groupId: data.groupId ?? null,
      track: data.track ?? null,
      allowMultiple: data.allowMultiple ?? false,
    })
    .returning();

  const now = new Date();
  if (row.sendNotification && row.publishTime <= now) {
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

export async function updateReflectionQuestion(
  id: number,
  data: Partial<{
    text: string;
    type: string;
    publishTime: string;
    endTime: string | null;
    points: number;
    sendNotification: boolean;
    groupId: string | null;
    track: string | null;
    allowMultiple: boolean;
  }>,
) {
  const patch: Record<string, unknown> = { ...data };
  if (data.publishTime != null) patch.publishTime = new Date(data.publishTime);
  if (data.endTime !== undefined) patch.endTime = data.endTime ? new Date(data.endTime) : null;
  const [row] = await db
    .update(reflectionQuestions)
    .set(patch)
    .where(eq(reflectionQuestions.id, id))
    .returning();
  return row ?? null;
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

export async function getCheckinSettings() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'checkin_settings'))
    .limit(1);
  const defaults = {
    enabledTracks: [] as string[],
    slots: ['08:30', '13:15', '19:30'],
  };
  if (setting?.value && typeof setting.value === 'object') {
    return { ...defaults, ...(setting.value as object) };
  }
  return defaults;
}

export async function setCheckinSettings(value: {
  enabledTracks: string[];
  slots: string[];
}) {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'checkin_settings'))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'checkin_settings', value });
  }
}

export async function getExchangeSlotSettings() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'exchange_slots'))
    .limit(1);
  return (setting?.value as string[]) ?? ['13:15', '15:00'];
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
  };
  return {
    publishHour: value.publishHour ?? 19,
    publishMinute: value.publishMinute ?? 30,
    points: value.points ?? 10,
  };
}

export async function setNfoDaySettings(value: {
  publishHour: number;
  publishMinute: number;
  points: number;
}) {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'nfo_day_config'))
    .limit(1);
  if (existing) {
    await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'nfo_day_config', value });
  }
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
  await db.delete(reflectionQuestions).where(eq(reflectionQuestions.id, id));
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

export async function getPointsSettings() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'points_config'))
    .limit(1);

  const defaults = {
    reflection_answer: 10,
    task_submission: 20,
    exchange_question: 5,
    exchange_answer: 5,
    nfo_day_reflection: 10,
    checkin: 5,
    diagnostics_complete: 100,
  };

  if (setting?.value && typeof setting.value === 'object') {
    return { ...defaults, ...(setting.value as Record<string, number>) };
  }
  return defaults;
}

export async function setPointsSettings(config: Record<string, number>) {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'points_config'))
    .limit(1);

  if (existing) {
    await db
      .update(systemSettings)
      .set({ value: config, updatedAt: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({ key: 'points_config', value: config });
  }
}
