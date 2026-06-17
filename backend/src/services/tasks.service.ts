import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { systemSettings, taskSubmissions, tasks } from '../db/schema.js';
import type { UserDto } from '../types/api.js';
import { awardPoints } from './points.service.js';
import { getNetworkingState, joinNetworkingQueue } from './taskNetworking.service.js';
import { validatePhotos } from '../utils/photoValidation.js';

export async function getTasks(user: UserDto) {
  const allTasks = await db.select().from(tasks);
  const userTasks = allTasks.filter((t) => !t.track || t.track === user.track);

  const submissions = await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.userId, user.id));

  const baseTasks = userTasks.map((t) => {
    const subs = submissions.filter((s) => s.taskId === t.id);
    const latest = subs[subs.length - 1];
    const isPastDeadline = t.deadline ? new Date() > t.deadline : false;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      points: t.points,
      deadline: t.deadline?.toISOString() ?? null,
      allowMultiple: t.allowMultiple,
      requiresPhoto: t.requiresPhoto,
      isRandomDistribution: t.isRandomDistribution,
      isFocusOfDay: t.isFocusOfDay,
      networkingContacts: t.networkingContacts ?? 1,
      isPastDeadline,
      status: latest?.status ?? 'new',
      submissionCount: subs.length,
    };
  });

  return Promise.all(
    baseTasks.map(async (t) => {
      if (!t.isRandomDistribution) return t;
      const networking = await getNetworkingState(t.id, user.id, t.networkingContacts);
      return {
        ...t,
        networkingStatus: networking?.status ?? null,
        networkingMode: networking?.mode ?? (t.networkingContacts > 1 ? 'multi' : 'pair'),
        contactsRequired: t.networkingContacts,
        partner: networking?.partner ?? null,
        partners: networking?.partners ?? [],
      };
    }),
  );
}

export async function getTask(taskId: number, userId: number) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return null;

  const subs = await db
    .select()
    .from(taskSubmissions)
    .where(and(eq(taskSubmissions.taskId, taskId), eq(taskSubmissions.userId, userId)));

  return { task, submissions: subs };
}

export async function applyNetworking(user: UserDto, taskId: number) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error('Task not found');
  if (!task.isRandomDistribution) throw new Error('Not a networking task');

  if (task.deadline && new Date() > task.deadline) {
    throw new Error('Deadline passed');
  }

  const contactsRequired = task.networkingContacts ?? 1;
  return joinNetworkingQueue(taskId, user.id, contactsRequired);
}

export async function submitTask(
  user: UserDto,
  taskId: number,
  answerText?: string,
  photos?: string[],
) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error('Task not found');

  if (task.deadline && new Date() > task.deadline) {
    throw new Error('Deadline passed');
  }

  if (task.requiresPhoto && (!photos || photos.length === 0)) {
    throw new Error('Photo is required for this task');
  }

  validatePhotos(photos);

  if (task.isRandomDistribution) {
    const contactsRequired = task.networkingContacts ?? 1;
    const networking = await getNetworkingState(taskId, user.id, contactsRequired);
    if (!networking || networking.status !== 'paired') {
      throw new Error(
        contactsRequired > 1
          ? 'Submit networking application and wait for contacts first'
          : 'Join networking queue and wait for a partner first',
      );
    }
  }

  if (!task.allowMultiple) {
    const existing = await db
      .select({ id: taskSubmissions.id })
      .from(taskSubmissions)
      .where(and(eq(taskSubmissions.taskId, taskId), eq(taskSubmissions.userId, user.id)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Already submitted');
    }
  }

  const status = task.autoApprove ? 'approved' : 'pending';

  const [created] = await db
    .insert(taskSubmissions)
    .values({
      taskId,
      userId: user.id,
      answerText: answerText ?? null,
      photos: photos ?? null,
      status,
    })
    .returning();

  if (task.autoApprove) {
    await awardPoints(user.id, task.points, 'task_submission', created.id);
  }

  return created;
}

export async function getDailyFocus() {
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'daily_focus'))
    .limit(1);

  if (!setting) {
    return {
      title: 'Неформальное = настоящее?',
      description:
        'Сегодня обращай внимание на моменты, когда обучение происходит само собой — без программы и плана.',
    };
  }

  const value = setting.value as { title?: string; description?: string };
  return {
    title: value.title ?? 'Фокус дня',
    description: value.description ?? '',
  };
}
