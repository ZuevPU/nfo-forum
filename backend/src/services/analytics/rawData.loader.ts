import { desc, eq } from 'drizzle-orm';
import { PARTICIPANT_ROLE } from '../../constants/roles.js';
import { DIAGNOSTICS_DATA } from '../../data/samodiagnostika.js';
import { db } from '../../db/index.js';
import {
  exchangeAnswers,
  exchangeQuestions,
  nfoDayReflections,
  reflectionAnswers,
  reflectionQuestions,
  stateCheckins,
  taskSubmissions,
  tasks,
  trainerSelfDiagnostics,
  users,
} from '../../db/schema.js';
import { moscowDateString } from '../../utils/moscowTime.js';
import {
  formatForumDayLabel,
  formatMoscowDateTime,
  formatMoscowTime,
  getForumDayColumns,
  resolveCheckinSlotLabel,
} from './analyticsTime.js';
import type {
  AnalyticsRawData,
  DiagnosticRow,
  ExchangeAnswerRow,
  ExchangeQuestionRow,
  ParticipantRow,
  QuestionCheckinRow,
  TaskExportRow,
} from './analytics.types.js';
import { getCheckinSettings } from '../admin.service.js';

function reflectionQuestionTypeLabel(type: string, createdAt: Date): string {
  if (type === 'entry') return 'Входной';
  if (type === 'final') return 'Выходной';
  if (type === 'evening') return `Рефлексия ${formatForumDayLabel(moscowDateString(createdAt))}`;
  return type;
}

function taskStatusLabel(status: string): string {
  if (status === 'approved') return 'Выполнено';
  if (status === 'pending') return 'На проверке';
  if (status === 'rejected') return 'Отклонено';
  return status;
}

function scopeLabel(scope: string): string {
  return scope === 'track' ? 'Только моему треку' : 'Всем участникам';
}

export async function loadAnalyticsRawData(): Promise<AnalyticsRawData> {
  const [forumDays, checkinSettings, participantRows, reflectionRows, nfoRows, checkinRows, diagnosticScores, submissionRows, exQuestions, exAnswers] =
    await Promise.all([
      getForumDayColumns(),
      getCheckinSettings(),
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          createdAt: users.createdAt,
          totalPoints: users.points,
          reflectionLevel: users.reflectionLevel,
        })
        .from(users)
        .where(eq(users.role, PARTICIPANT_ROLE))
        .orderBy(desc(users.points)),
      db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          createdAt: reflectionAnswers.createdAt,
          questionText: reflectionQuestions.text,
          questionType: reflectionQuestions.type,
          answer: reflectionAnswers.answerText,
        })
        .from(reflectionAnswers)
        .innerJoin(users, eq(reflectionAnswers.userId, users.id))
        .innerJoin(reflectionQuestions, eq(reflectionAnswers.questionId, reflectionQuestions.id))
        .orderBy(desc(reflectionAnswers.createdAt)),
      db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          date: nfoDayReflections.date,
          createdAt: nfoDayReflections.createdAt,
          answerText: nfoDayReflections.answerText,
          factors: nfoDayReflections.factors,
        })
        .from(nfoDayReflections)
        .innerJoin(users, eq(nfoDayReflections.userId, users.id))
        .orderBy(desc(nfoDayReflections.createdAt)),
      db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          emotion: stateCheckins.emotion,
          energyLevel: stateCheckins.energyLevel,
          comment: stateCheckins.comment,
          createdAt: stateCheckins.createdAt,
        })
        .from(stateCheckins)
        .innerJoin(users, eq(stateCheckins.userId, users.id))
        .orderBy(desc(stateCheckins.createdAt)),
      db
        .select({
          userId: trainerSelfDiagnostics.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          blockId: trainerSelfDiagnostics.blockId,
          score: trainerSelfDiagnostics.score,
          attemptNumber: trainerSelfDiagnostics.attemptNumber,
          createdAt: trainerSelfDiagnostics.createdAt,
        })
        .from(trainerSelfDiagnostics)
        .innerJoin(users, eq(trainerSelfDiagnostics.userId, users.id))
        .orderBy(trainerSelfDiagnostics.userId, trainerSelfDiagnostics.attemptNumber),
      db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          taskTitle: tasks.title,
          taskPoints: tasks.points,
          answer: taskSubmissions.answerText,
          photos: taskSubmissions.photos,
          status: taskSubmissions.status,
          createdAt: taskSubmissions.createdAt,
        })
        .from(taskSubmissions)
        .innerJoin(users, eq(taskSubmissions.userId, users.id))
        .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
        .orderBy(desc(taskSubmissions.createdAt)),
      db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          text: exchangeQuestions.text,
          scope: exchangeQuestions.scope,
          createdAt: exchangeQuestions.createdAt,
          questionId: exchangeQuestions.id,
        })
        .from(exchangeQuestions)
        .innerJoin(users, eq(exchangeQuestions.userId, users.id))
        .orderBy(desc(exchangeQuestions.createdAt)),
      db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          track: users.track,
          questionId: exchangeAnswers.questionId,
          answer: exchangeAnswers.answerText,
          createdAt: exchangeAnswers.createdAt,
        })
        .from(exchangeAnswers)
        .innerJoin(users, eq(exchangeAnswers.userId, users.id))
        .orderBy(desc(exchangeAnswers.createdAt)),
    ]);

  const answerCounts = new Map<number, number>();
  for (const a of exAnswers) {
    answerCounts.set(a.questionId, (answerCounts.get(a.questionId) ?? 0) + 1);
  }

  const questionTextMap = new Map(exQuestions.map((q) => [q.questionId, q.text]));

  const participants: ParticipantRow[] = participantRows.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    track: p.track,
    createdAt: p.createdAt,
    totalPoints: p.totalPoints + (participantRows.find((x) => x.id === p.id)?.reflectionLevel ?? 0),
    reflectionLevel: p.reflectionLevel,
  }));

  // Fix totalPoints - should be points + reflection_points from users
  const participantsFixed: ParticipantRow[] = participantRows.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    track: p.track,
    createdAt: p.createdAt,
    totalPoints: p.totalPoints,
    reflectionLevel: p.reflectionLevel,
  }));

  const questionCheckinRows: QuestionCheckinRow[] = [];

  for (const r of reflectionRows) {
    questionCheckinRows.push({
      firstName: r.firstName,
      lastName: r.lastName,
      track: r.track,
      date: formatForumDayLabel(moscowDateString(r.createdAt)),
      time: formatMoscowTime(r.createdAt),
      question: r.questionText,
      answer: r.answer,
      factors: '',
      questionType: reflectionQuestionTypeLabel(r.questionType, r.createdAt),
    });
  }

  for (const r of nfoRows) {
    questionCheckinRows.push({
      firstName: r.firstName,
      lastName: r.lastName,
      track: r.track,
      date: formatForumDayLabel(String(r.date)),
      time: formatMoscowTime(r.createdAt),
      question: 'Вопрос дня (НФО)',
      answer: r.answerText,
      factors: (r.factors ?? []).join('; '),
      questionType: `Рефлексия ${formatForumDayLabel(String(r.date))}`,
    });
  }

  for (const r of checkinRows) {
    const slotLabel = resolveCheckinSlotLabel(r.createdAt, checkinSettings);
    questionCheckinRows.push({
      firstName: r.firstName,
      lastName: r.lastName,
      track: r.track,
      date: formatForumDayLabel(moscowDateString(r.createdAt)),
      time: formatMoscowTime(r.createdAt),
      question: 'Чек-ин состояния',
      answer: `${r.emotion}; ${r.energyLevel}/10${r.comment ? ` — ${r.comment}` : ''}`,
      factors: '',
      questionType: `Чек-ин (${slotLabel.replace(' чек-in', '').toLowerCase()})`,
    });
  }

  const diagnosticMap = new Map<string, DiagnosticRow>();
  for (const row of diagnosticScores) {
    const key = `${row.userId}:${row.attemptNumber}`;
    const attemptType = row.attemptNumber <= 1 ? 'Входная' : 'Выходная';
    const existing = diagnosticMap.get(key) ?? {
      firstName: row.firstName,
      lastName: row.lastName,
      track: row.track,
      attemptType,
      scores: {},
      avgScore: null,
      completedAt: row.createdAt,
    };
    existing.scores[row.blockId] = row.score;
    if (row.createdAt > existing.completedAt) existing.completedAt = row.createdAt;
    diagnosticMap.set(key, existing);
  }

  const diagnosticRows: DiagnosticRow[] = [...diagnosticMap.values()].map((row) => {
    const scores = Object.values(row.scores);
    return {
      ...row,
      avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
    };
  });

  const taskRows: TaskExportRow[] = submissionRows.map((r) => ({
    firstName: r.firstName,
    lastName: r.lastName,
    track: r.track,
    taskTitle: r.taskTitle,
    dateTime: formatMoscowDateTime(r.createdAt),
    answer: r.answer ?? '',
    photo: (r.photos ?? []).join('; '),
    points: r.status === 'approved' ? r.taskPoints : 0,
    status: taskStatusLabel(r.status),
  }));

  const exchangeQuestionRows: ExchangeQuestionRow[] = exQuestions.map((q) => ({
    firstName: q.firstName,
    lastName: q.lastName,
    track: q.track,
    text: q.text,
    audience: scopeLabel(q.scope),
    dateTime: formatMoscowDateTime(q.createdAt),
    answersCount: answerCounts.get(q.questionId) ?? 0,
  }));

  const exchangeAnswerRows: ExchangeAnswerRow[] = exAnswers.map((a) => ({
    firstName: a.firstName,
    lastName: a.lastName,
    track: a.track,
    questionText: questionTextMap.get(a.questionId) ?? '',
    answer: a.answer,
    dateTime: formatMoscowDateTime(a.createdAt),
  }));

  return {
    participants: participantsFixed,
    questionCheckinRows,
    diagnosticRows,
    taskRows,
    exchangeQuestions: exchangeQuestionRows,
    exchangeAnswers: exchangeAnswerRows,
    forumDays,
  };
}

export const SKILL_COLUMNS = DIAGNOSTICS_DATA.skills.map((s, i) => ({
  id: s.id,
  shortTitle: `У${i + 1} ${s.title.split(' ').slice(0, 2).join(' ')}`,
  title: s.title,
}));
