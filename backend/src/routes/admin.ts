import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { requireUser } from '../middleware/requireUser.js';
import {
  createEvent,
  createReflectionQuestion,
  createTask,
  deleteEvent,
  deleteReflectionQuestion,
  deleteTask,
  listEvents,
  listPendingExchangeQuestions,
  listPendingSubmissions,
  listReflectionQuestions,
  listTasks,
  moderateExchangeQuestion,
  hideExchangeQuestion,
  moderateSubmission,
  updateEvent,
  updateTask,
  listBroadcasts,
  getDiagnosticsSettings,
  setDiagnosticsSettings,
  getDiagnosticsResults,
  generateDiagnosticsCSV,
  getPointsSettings,
  setPointsSettings,
  listReflectionAnswers,
  updateReflectionQuestion,
  getNfoDayStats,
  getCheckinSettings,
  setCheckinSettings,
  getExchangeSlotSettings,
  setExchangeSlotSettings,
  getNfoDaySettings,
  setNfoDaySettings,
  getDailyFocusSettings,
  setDailyFocusSettings,
  listActivityLogs,
} from '../services/admin.service.js';
import {
  getReflectionLevelSettings,
  setReflectionLevelSettings,
} from '../services/reflectionLevelSettings.service.js';
import { getExchangeActivity } from '../services/exchange.service.js';
import {
  adjustUserPoints,
  generateCheckinsCSV,
  generateExchangeCSV,
  generateNfoDayCSV,
  generatePointsHistoryCSV,
  generateRatingCSV,
  generateReflectionCSV,
  generateTasksCSV,
  generateActivityCSV,
  generateExportXlsx,
  listFeedbackMessages,
  listUsers,
} from '../services/export.service.js';
import { sendPush } from '../services/push.service.js';

export const adminRouter = Router();

adminRouter.use(requireUser, requireAdmin);

adminRouter.get('/broadcasts', async (_req, res) => {
  const rows = await listBroadcasts();
  res.json({ broadcasts: rows });
});

adminRouter.get('/events', async (_req, res) => {
  const rows = await listEvents();
  res.json({ events: rows });
});

adminRouter.post('/events', async (req, res) => {
  const event = await createEvent(req.body);
  res.status(201).json({ event });
});

adminRouter.patch('/events/:id', async (req, res) => {
  const event = await updateEvent(Number(req.params.id), req.body);
  if (!event) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ event });
});

adminRouter.delete('/events/:id', async (req, res) => {
  await deleteEvent(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.get('/tasks', async (_req, res) => {
  const rows = await listTasks();
  res.json({ tasks: rows });
});

adminRouter.post('/tasks', async (req, res) => {
  const task = await createTask(req.body);
  res.status(201).json({ task });
});

adminRouter.patch('/tasks/:id', async (req, res) => {
  const task = await updateTask(Number(req.params.id), req.body);
  if (!task) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ task });
});

adminRouter.delete('/tasks/:id', async (req, res) => {
  await deleteTask(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.get('/exchange/pending', async (_req, res) => {
  const questions = await listPendingExchangeQuestions();
  res.json({ questions });
});

adminRouter.post('/exchange/:id/moderate', async (req, res) => {
  const { status, publishTime } = req.body as { status?: 'approved' | 'rejected'; publishTime?: string };
  if (!status) {
    res.status(400).json({ error: 'status required' });
    return;
  }
  const question = await moderateExchangeQuestion(Number(req.params.id), status, publishTime);
  res.json({ question });
});

adminRouter.post('/exchange/:id/hide', async (req, res) => {
  const question = await hideExchangeQuestion(Number(req.params.id));
  if (!question) {
    res.status(404).json({ error: 'Question not found or not published' });
    return;
  }
  res.json({ question });
});

adminRouter.get('/submissions/pending', async (_req, res) => {
  const submissions = await listPendingSubmissions();
  res.json({ submissions });
});

adminRouter.post('/submissions/:id/moderate', async (req, res) => {
  const { status, admin_comment } = req.body as {
    status?: 'approved' | 'rejected';
    admin_comment?: string;
  };
  if (!status) {
    res.status(400).json({ error: 'status required' });
    return;
  }
  const submission = await moderateSubmission(Number(req.params.id), status, admin_comment);
  res.json({ submission });
});

adminRouter.get('/reflection-answers', async (req, res) => {
  const track = req.query.track as string | undefined;
  const day = req.query.day as string | undefined;
  const answers = await listReflectionAnswers(track, day);
  res.json({ answers });
});

adminRouter.patch('/reflection-questions/:id', async (req, res) => {
  const question = await updateReflectionQuestion(Number(req.params.id), req.body);
  if (!question) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ question });
});

adminRouter.get('/nfo-day/stats', async (_req, res) => {
  const stats = await getNfoDayStats();
  res.json(stats);
});

adminRouter.get('/settings/checkin', async (_req, res) => {
  res.json(await getCheckinSettings());
});

adminRouter.post('/settings/checkin', async (req, res) => {
  await setCheckinSettings(req.body as { enabledTracks: string[]; slots: string[] });
  res.json({ ok: true });
});

adminRouter.get('/settings/exchange-slots', async (_req, res) => {
  res.json({ slots: await getExchangeSlotSettings() });
});

adminRouter.post('/settings/exchange-slots', async (req, res) => {
  const { slots } = req.body as { slots: string[] };
  if (!Array.isArray(slots)) {
    res.status(400).json({ error: 'slots must be an array' });
    return;
  }
  await setExchangeSlotSettings(slots);
  res.json({ ok: true });
});

adminRouter.get('/settings/nfo-day', async (_req, res) => {
  res.json(await getNfoDaySettings());
});

adminRouter.post('/settings/nfo-day', async (req, res) => {
  const { publishHour, publishMinute, points } = req.body as {
    publishHour?: number;
    publishMinute?: number;
    points?: number;
  };
  await setNfoDaySettings({
    publishHour: publishHour ?? 19,
    publishMinute: publishMinute ?? 30,
    points: points ?? 10,
  });
  res.json({ ok: true });
});

adminRouter.get('/settings/daily-focus', async (_req, res) => {
  res.json(await getDailyFocusSettings());
});

adminRouter.post('/settings/daily-focus', async (req, res) => {
  const { title, taskId } = req.body as { title?: string; taskId?: number | null };
  await setDailyFocusSettings(title ?? '', taskId);
  res.json({ ok: true });
});

adminRouter.get('/activity', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const logs = await listActivityLogs(limit);
  res.json({ logs });
});

adminRouter.get('/exchange/activity', async (_req, res) => {
  const activity = await getExchangeActivity();
  res.json({ activity });
});

adminRouter.get('/reflection-questions', async (_req, res) => {
  const questions = await listReflectionQuestions();
  res.json({ questions });
});

adminRouter.post('/reflection-questions', async (req, res) => {
  const question = await createReflectionQuestion(req.body);
  res.status(201).json({ question });
});

adminRouter.delete('/reflection-questions/:id', async (req, res) => {
  await deleteReflectionQuestion(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.post('/push/send', async (req: AuthenticatedRequest, res) => {
  const { text, image, target_type, target_tracks, target_user_id, scheduled_at } = req.body as {
    text?: string;
    image?: string;
    target_type?: 'all' | 'track' | 'user';
    target_tracks?: string[];
    target_user_id?: number;
    scheduled_at?: string;
  };
  if (!text || !target_type) {
    res.status(400).json({ error: 'text and target_type are required' });
    return;
  }
  const scheduledAt = scheduled_at ? new Date(scheduled_at) : undefined;
  if (scheduled_at && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    res.status(400).json({ error: 'Invalid scheduled_at' });
    return;
  }
  const result = await sendPush({
    text,
    image,
    targetType: target_type,
    targetTracks: target_tracks,
    targetUserId: target_user_id,
    scheduledAt,
  });
  res.json(result);
});

// Diagnostics
adminRouter.get('/diagnostics/settings', async (_req, res) => {
  const tracks = await getDiagnosticsSettings();
  res.json({ tracks });
});

adminRouter.post('/diagnostics/settings', async (req, res) => {
  const { tracks } = req.body as { tracks: string[] };
  if (!Array.isArray(tracks)) {
    res.status(400).json({ error: 'tracks must be an array' });
    return;
  }
  await setDiagnosticsSettings(tracks);
  res.json({ ok: true });
});

adminRouter.get('/diagnostics/results', async (_req, res) => {
  const results = await getDiagnosticsResults();
  res.json({ results });
});

adminRouter.get('/diagnostics/export', async (_req, res) => {
  const csv = await generateDiagnosticsCSV();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="diagnostics.csv"');
  res.send('\uFEFF' + csv);
});

adminRouter.get('/users', async (req, res) => {
  const track = req.query.track as string | undefined;
  const rows = await listUsers(track);
  res.json({ users: rows });
});

adminRouter.post('/users/:id/points', async (req, res) => {
  const { points, comment } = req.body as { points?: number; comment?: string };
  if (typeof points !== 'number') {
    res.status(400).json({ error: 'points is required' });
    return;
  }
  const result = await adjustUserPoints(Number(req.params.id), points, comment ?? 'Admin adjustment');
  res.json(result);
});

adminRouter.get('/feedback', async (_req, res) => {
  const messages = await listFeedbackMessages();
  res.json({ messages });
});

adminRouter.get('/settings/points', async (_req, res) => {
  const config = await getPointsSettings();
  res.json({ config });
});

adminRouter.post('/settings/points', async (req, res) => {
  await setPointsSettings(req.body as Record<string, number>);
  res.json({ ok: true });
});

adminRouter.get('/settings/reflection-levels', async (_req, res) => {
  const settings = await getReflectionLevelSettings();
  res.json(settings);
});

adminRouter.post('/settings/reflection-levels', async (req, res) => {
  const { thresholds } = req.body as { thresholds?: number[] };
  if (!Array.isArray(thresholds)) {
    res.status(400).json({ error: 'thresholds array is required' });
    return;
  }
  const settings = await setReflectionLevelSettings(thresholds);
  res.json(settings);
});

function sendCsv(res: import('express').Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
}

adminRouter.get('/export/reflection', async (_req, res) => {
  sendCsv(res, 'reflection.csv', await generateReflectionCSV());
});

adminRouter.get('/export/tasks', async (_req, res) => {
  sendCsv(res, 'tasks.csv', await generateTasksCSV());
});

adminRouter.get('/export/exchange', async (_req, res) => {
  sendCsv(res, 'exchange.csv', await generateExchangeCSV());
});

adminRouter.get('/export/rating', async (_req, res) => {
  sendCsv(res, 'rating.csv', await generateRatingCSV());
});

adminRouter.get('/export/checkins', async (_req, res) => {
  sendCsv(res, 'checkins.csv', await generateCheckinsCSV());
});

adminRouter.get('/export/nfo-day', async (_req, res) => {
  sendCsv(res, 'nfo-day.csv', await generateNfoDayCSV());
});

adminRouter.get('/export/points-history', async (_req, res) => {
  sendCsv(res, 'points-history.csv', await generatePointsHistoryCSV());
});

adminRouter.get('/export/activity', async (_req, res) => {
  sendCsv(res, 'activity.csv', await generateActivityCSV());
});

adminRouter.get('/export/:type/xlsx', async (req, res) => {
  const buf = await generateExportXlsx(req.params.type);
  if (!buf) {
    res.status(404).json({ error: 'Unknown export type' });
    return;
  }
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}.xlsx"`);
  res.send(buf);
});
