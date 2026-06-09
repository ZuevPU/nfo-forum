import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  events,
  exchangeQuestions,
  pointsHistory,
  reflectionQuestions,
  taskSubmissions,
  tasks,
  users,
} from '../db/schema.js';
import { assignRandomRespondents } from './exchange.service.js';
import { awardPoints } from './points.service.js';

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

export async function moderateExchangeQuestion(id: number, status: 'approved' | 'rejected') {
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
      publishTime: status === 'approved' ? new Date() : null,
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
  points?: number;
  track?: string | null;
}) {
  const [row] = await db
    .insert(reflectionQuestions)
    .values({
      text: data.text,
      type: data.type,
      publishTime: new Date(data.publishTime),
      points: data.points ?? 10,
      track: data.track ?? null,
    })
    .returning();
  return row;
}

export async function deleteReflectionQuestion(id: number) {
  await db.delete(reflectionQuestions).where(eq(reflectionQuestions.id, id));
}
