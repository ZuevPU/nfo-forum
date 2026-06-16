import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  exchangeAnswers,
  exchangeQuestions,
  feedbackMessages,
  nfoDayReflections,
  pointsHistory,
  reflectionAnswers,
  reflectionQuestions,
  stateCheckins,
  taskSubmissions,
  tasks,
  users,
} from '../db/schema.js';

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map((v) => csvEscape(v)).join(','))].join('\n');
}

export async function generateReflectionCSV(): Promise<string> {
  const rows = await db
    .select({
      userName: users.firstName,
      userLastName: users.lastName,
      track: users.track,
      question: reflectionQuestions.text,
      answer: reflectionAnswers.answerText,
      createdAt: reflectionAnswers.createdAt,
    })
    .from(reflectionAnswers)
    .innerJoin(users, eq(reflectionAnswers.userId, users.id))
    .innerJoin(reflectionQuestions, eq(reflectionAnswers.questionId, reflectionQuestions.id))
    .orderBy(desc(reflectionAnswers.createdAt));

  return toCsv(
    ['Имя', 'Фамилия', 'Трек', 'Вопрос', 'Ответ', 'Дата'],
    rows.map((r) => [
      r.userName,
      r.userLastName ?? '',
      r.track ?? '',
      r.question,
      r.answer,
      new Date(r.createdAt).toISOString(),
    ]),
  );
}

export async function generateTasksCSV(): Promise<string> {
  const rows = await db
    .select({
      userName: users.firstName,
      userLastName: users.lastName,
      track: users.track,
      taskTitle: tasks.title,
      answer: taskSubmissions.answerText,
      photos: taskSubmissions.photos,
      status: taskSubmissions.status,
      createdAt: taskSubmissions.createdAt,
    })
    .from(taskSubmissions)
    .innerJoin(users, eq(taskSubmissions.userId, users.id))
    .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
    .orderBy(desc(taskSubmissions.createdAt));

  return toCsv(
    ['Имя', 'Фамилия', 'Трек', 'Задание', 'Ответ', 'Фото', 'Статус', 'Дата'],
    rows.map((r) => [
      r.userName,
      r.userLastName ?? '',
      r.track ?? '',
      r.taskTitle,
      r.answer ?? '',
      (r.photos ?? []).join('; '),
      r.status,
      new Date(r.createdAt).toISOString(),
    ]),
  );
}

export async function generateExchangeCSV(): Promise<string> {
  const questions = await db.select().from(exchangeQuestions).orderBy(desc(exchangeQuestions.createdAt));
  const answers = await db
    .select({
      questionId: exchangeAnswers.questionId,
      answer: exchangeAnswers.answerText,
      answerAuthorId: exchangeAnswers.userId,
      createdAt: exchangeAnswers.createdAt,
    })
    .from(exchangeAnswers)
    .orderBy(desc(exchangeAnswers.createdAt));

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const qMap = new Map(questions.map((q) => [q.id, q]));

  return toCsv(
    ['Вопрос', 'Автор вопроса', 'Трек автора', 'Ответ', 'Автор ответа', 'Дата'],
    answers.map((a) => {
      const q = qMap.get(a.questionId);
      const author = q ? userMap.get(q.userId) : null;
      const answerAuthor = userMap.get(a.answerAuthorId);
      return [
        q?.text ?? '',
        author ? `${author.firstName} ${author.lastName ?? ''}`.trim() : '',
        author?.track ?? '',
        a.answer,
        answerAuthor ? `${answerAuthor.firstName} ${answerAuthor.lastName ?? ''}`.trim() : '',
        new Date(a.createdAt).toISOString(),
      ];
    }),
  );
}

export async function generateRatingCSV(): Promise<string> {
  const rows = await db.select().from(users).orderBy(desc(users.points));
  return toCsv(
    ['ID', 'Имя', 'Фамилия', 'Трек', 'Баллы', 'Уровень рефлексии', 'Баллы рефлексии', 'Дата регистрации'],
    rows.map((r) => [
      r.id,
      r.firstName,
      r.lastName ?? '',
      r.track ?? '',
      r.points,
      r.reflectionLevel,
      r.reflectionPoints,
      new Date(r.createdAt).toISOString(),
    ]),
  );
}

export async function generateCheckinsCSV(): Promise<string> {
  const rows = await db
    .select({
      userName: users.firstName,
      userLastName: users.lastName,
      track: users.track,
      emotion: stateCheckins.emotion,
      energyLevel: stateCheckins.energyLevel,
      comment: stateCheckins.comment,
      createdAt: stateCheckins.createdAt,
    })
    .from(stateCheckins)
    .innerJoin(users, eq(stateCheckins.userId, users.id))
    .orderBy(desc(stateCheckins.createdAt));

  return toCsv(
    ['Имя', 'Фамилия', 'Трек', 'Эмоция', 'Энергия', 'Комментарий', 'Дата'],
    rows.map((r) => [
      r.userName,
      r.userLastName ?? '',
      r.track ?? '',
      r.emotion,
      r.energyLevel,
      r.comment ?? '',
      new Date(r.createdAt).toISOString(),
    ]),
  );
}

export async function generateNfoDayCSV(): Promise<string> {
  const rows = await db
    .select({
      userName: users.firstName,
      userLastName: users.lastName,
      track: users.track,
      date: nfoDayReflections.date,
      answer: nfoDayReflections.answerText,
      factors: nfoDayReflections.factors,
    })
    .from(nfoDayReflections)
    .innerJoin(users, eq(nfoDayReflections.userId, users.id))
    .orderBy(desc(nfoDayReflections.createdAt));

  return toCsv(
    ['Имя', 'Фамилия', 'Трек', 'Дата', 'Ответ', 'Факторы'],
    rows.map((r) => [
      r.userName,
      r.userLastName ?? '',
      r.track ?? '',
      r.date,
      r.answer,
      r.factors.join('; '),
    ]),
  );
}

export async function generatePointsHistoryCSV(userId?: number): Promise<string> {
  const rows = userId
    ? await db
        .select()
        .from(pointsHistory)
        .where(eq(pointsHistory.userId, userId))
        .orderBy(desc(pointsHistory.createdAt))
    : await db.select().from(pointsHistory).orderBy(desc(pointsHistory.createdAt));

  const userMap = new Map(
    (await db.select().from(users)).map((u) => [u.id, u]),
  );

  return toCsv(
    ['Пользователь', 'Баллы', 'Источник', 'Комментарий', 'Дата'],
    rows.map((r) => {
      const u = userMap.get(r.userId);
      return [
        u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : r.userId,
        r.points,
        r.source,
        r.comment ?? '',
        new Date(r.createdAt).toISOString(),
      ];
    }),
  );
}

export async function listFeedbackMessages() {
  const rows = await db
    .select({
      id: feedbackMessages.id,
      text: feedbackMessages.text,
      createdAt: feedbackMessages.createdAt,
      userId: feedbackMessages.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      track: users.track,
    })
    .from(feedbackMessages)
    .innerJoin(users, eq(feedbackMessages.userId, users.id))
    .orderBy(desc(feedbackMessages.createdAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listUsers(track?: string) {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  const filtered = track ? rows.filter((u) => u.track === track) : rows;
  return filtered.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function adjustUserPoints(userId: number, points: number, comment: string) {
  await db.insert(pointsHistory).values({
    userId,
    points,
    source: 'admin_adjustment',
    comment,
  });

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  await db
    .update(users)
    .set({ points: user.points + points })
    .where(eq(users.id, userId));

  return { newPoints: user.points + points };
}
