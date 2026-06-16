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
import { DIAGNOSTICS_DATA } from '../data/samodiagnostika.js';

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
    .select()
    .from(taskSubmissions)
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

  if (!row || status !== 'approved') return row ?? null;

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
    })
    .returning();
  return row;
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
