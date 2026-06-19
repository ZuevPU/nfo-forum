import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { requireUser } from '../middleware/requireUser.js';
import {
  createEvent,
  createReflectionQuestion,
  publishReflectionQuestion,
  createTask,
  publishTask,
  deleteEvent,
  deleteExchangeQuestion,
  deleteReflectionQuestion,
  deleteTask,
  listEvents,
  listPendingExchangeQuestions,
  listPendingSubmissions,
  listAllTaskSubmissions,
  listTaskSubmissions,
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
  getInsightsSettings,
  setInsightsSettings,
  getNfoDaySettings,
  setNfoDaySettings,
  getDailyFocusSettings,
  setDailyFocusSettings,
  listDiagnosticProfileFeedback,
  listActivityLogs,
} from '../services/admin.service.js';
import {
  getNetworkingLunchConfig,
  setNetworkingLunchConfig,
  listNetworkingLunchApplications,
  listNetworkingLunchAssignments,
  randomizeNetworkingLunchAssignments,
  saveNetworkingLunchAssignments,
  removeNetworkingLunchAssignment,
  publishNetworkingLunchAssignments,
  publishNetworkingLunchRegistration,
  unpublishNetworkingLunchRegistration,
  sendNetworkingLunchInvitation,
} from '../services/networkingLunch.service.js';
import {
  getReflectionLevelSettings,
  setReflectionLevelSettings,
} from '../services/reflectionLevelSettings.service.js';
import { getExchangeActivity } from '../services/exchange.service.js';
import { contentDispositionAttachment, getExportMeta } from '../constants/exportMeta.js';
import {
  adjustUserPoints,
  EXPORT_GENERATORS,
  generateExportXlsx,
  listUsers,
  updateUserTrack,
} from '../services/export.service.js';
import { listAdminFeedbackMessages, replyToFeedback } from '../services/feedback.service.js';
import { sendPush, getPushSubscriptionStats } from '../services/push.service.js';
import { analyticsRouter } from './analytics.js';

export const adminRouter = Router();

adminRouter.use(requireUser, requireAdmin);
adminRouter.use('/analytics', analyticsRouter);

adminRouter.get('/broadcasts', async (_req, res) => {
  const rows = await listBroadcasts();
  res.json({ broadcasts: rows });
});

adminRouter.get('/push/stats', async (_req, res) => {
  const stats = await getPushSubscriptionStats();
  res.json({ stats });
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

adminRouter.get('/tasks/submissions', async (req, res) => {
  const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
  const taskIdRaw = req.query.taskId;
  const taskId = taskIdRaw != null && taskIdRaw !== '' ? Number(taskIdRaw) : undefined;
  const limitRaw = req.query.limit;
  const limit = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : undefined;
  if (taskId != null && Number.isNaN(taskId)) {
    res.status(400).json({ error: 'Invalid taskId' });
    return;
  }
  const submissions = await listAllTaskSubmissions({ status, taskId, limit });
  res.json({ submissions });
});

adminRouter.get('/tasks/:id/submissions', async (req, res) => {
  const taskId = Number(req.params.id);
  if (Number.isNaN(taskId)) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }
  const submissions = await listTaskSubmissions(taskId);
  res.json({ submissions });
});

adminRouter.patch('/tasks/:id', async (req, res) => {
  const task = await updateTask(Number(req.params.id), req.body);
  if (!task) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ task });
});

adminRouter.post('/tasks/:id/publish', async (req, res) => {
  const task = await publishTask(Number(req.params.id));
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

adminRouter.delete('/exchange/:id', async (req, res) => {
  const deleted = await deleteExchangeQuestion(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ ok: true });
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
  await setCheckinSettings(req.body as Partial<import('../services/admin.service.js').CheckinSettingsValue> & {
    enabledTracks: string[];
    slots: string[];
  });
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

adminRouter.get('/settings/insights', async (_req, res) => {
  res.json(await getInsightsSettings());
});

adminRouter.post('/settings/insights', async (req, res) => {
  const body = req.body as { prompt?: string; placeholder?: string };
  const settings = await setInsightsSettings({
    prompt: body.prompt ?? '',
    placeholder: body.placeholder ?? '',
  });
  res.json({ ok: true, settings });
});

adminRouter.get('/settings/nfo-day', async (_req, res) => {
  res.json(await getNfoDaySettings());
});

adminRouter.post('/settings/nfo-day', async (req, res) => {
  const body = req.body as {
    publishHour?: number;
    publishMinute?: number;
    points?: number;
    question?: string;
    panelTitle?: string;
    panelSubtitle?: string;
    factors?: string[];
    questions?: Array<{
      id: string;
      label: string;
      type: 'text' | 'multiselect';
      required?: boolean;
      maxSelect?: number;
    }>;
  };
  const settings = await setNfoDaySettings(body);
  res.json({ ok: true, settings });
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

adminRouter.post('/reflection-questions/:id/publish', async (req, res) => {
  const question = await publishReflectionQuestion(Number(req.params.id));
  if (!question) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ question });
});

adminRouter.delete('/reflection-questions/:id', async (req, res) => {
  const deleted = await deleteReflectionQuestion(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ ok: true });
});

adminRouter.post('/push/send', async (req: AuthenticatedRequest, res) => {
  const { text, image, image_media_id, link_hash, target_type, target_tracks, target_user_id, scheduled_at } = req.body as {
    text?: string;
    image?: string;
    image_media_id?: string;
    link_hash?: string;
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
    imageMediaId: image_media_id,
    linkHash: link_hash,
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

adminRouter.get('/diagnostics/profile-feedback', async (_req, res) => {
  const feedback = await listDiagnosticProfileFeedback();
  res.json({ feedback });
});

adminRouter.get('/diagnostics/export', async (_req, res) => {
  const csv = await generateDiagnosticsCSV();
  const meta = getExportMeta('diagnostics')!;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', contentDispositionAttachment(meta.csvFilename));
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

adminRouter.patch('/users/:id/track', async (req, res) => {
  try {
    const { track } = req.body as { track?: string };
    if (!track || typeof track !== 'string') {
      res.status(400).json({ error: 'track is required' });
      return;
    }
    const result = await updateUserTrack(Number(req.params.id), track);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update track failed';
    res.status(400).json({ error: message });
  }
});

adminRouter.get('/feedback', async (_req, res) => {
  const messages = await listAdminFeedbackMessages();
  res.json({ messages });
});

adminRouter.post('/feedback/:id/reply', async (req: AuthenticatedRequest, res) => {
  try {
    const messageId = Number(req.params.id);
    if (Number.isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid message id' });
      return;
    }
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const result = await replyToFeedback(messageId, req.user!.id, text);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reply failed';
    const status = message === 'Message not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

adminRouter.get('/settings/points', async (_req, res) => {
  const { getPointsSystemForAdmin } = await import('../services/pointsEngine.service.js');
  const data = await getPointsSystemForAdmin();
  res.json(data);
});

adminRouter.post('/settings/points', async (req, res) => {
  const body = req.body as { rules?: Record<string, { pointsPerAction?: number; maxTotal?: number; maxCount?: number }> };
  await setPointsSettings({ rules: body.rules ?? {} });
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
  res.setHeader('Content-Disposition', contentDispositionAttachment(filename));
  res.send('\uFEFF' + csv);
}

for (const [type, generator] of Object.entries(EXPORT_GENERATORS)) {
  if (type === 'diagnostics') continue;
  adminRouter.get(`/export/${type}`, async (_req, res) => {
    const meta = getExportMeta(type);
    sendCsv(res, meta?.csvFilename ?? `${type}.csv`, await generator());
  });
}

adminRouter.get('/networking-lunch/config', async (_req, res) => {
  const config = await getNetworkingLunchConfig();
  res.json({ config });
});

adminRouter.put('/networking-lunch/config', async (req, res) => {
  const config = await setNetworkingLunchConfig(req.body ?? {});
  res.json({ config });
});

adminRouter.get('/networking-lunch/applications', async (_req, res) => {
  const data = await listNetworkingLunchApplications();
  res.json(data);
});

adminRouter.get('/networking-lunch/assignments', async (_req, res) => {
  const tables = await listNetworkingLunchAssignments();
  res.json({ tables });
});

adminRouter.post('/networking-lunch/randomize', async (_req, res) => {
  const tables = await randomizeNetworkingLunchAssignments();
  res.json({ tables });
});

adminRouter.put('/networking-lunch/assignments', async (req, res) => {
  const assignments = (req.body?.assignments ?? []) as {
    userId: number;
    tableNumber: number;
    isPinned?: boolean;
  }[];
  const tables = await saveNetworkingLunchAssignments(assignments);
  res.json({ tables });
});

adminRouter.delete('/networking-lunch/assignments/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: 'Invalid userId' });
    return;
  }
  await removeNetworkingLunchAssignment(userId);
  const tables = await listNetworkingLunchAssignments();
  res.json({ tables });
});

adminRouter.post('/networking-lunch/publish-registration', async (_req, res) => {
  try {
    const config = await publishNetworkingLunchRegistration();
    res.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    res.status(400).json({ error: message });
  }
});

adminRouter.post('/networking-lunch/unpublish-registration', async (_req, res) => {
  try {
    const config = await unpublishNetworkingLunchRegistration();
    res.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unpublish failed';
    res.status(400).json({ error: message });
  }
});

adminRouter.post('/networking-lunch/publish', async (_req, res) => {
  try {
    const result = await publishNetworkingLunchAssignments();
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    res.status(400).json({ error: message });
  }
});

adminRouter.post('/networking-lunch/send-invitation', async (_req, res) => {
  try {
    const result = await sendNetworkingLunchInvitation();
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send invitation failed';
    res.status(400).json({ error: message });
  }
});

adminRouter.get('/export/:type/xlsx', async (req, res) => {
  const buf = await generateExportXlsx(req.params.type);
  if (!buf) {
    res.status(404).json({ error: 'Unknown export type' });
    return;
  }
  const meta = getExportMeta(req.params.type);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    contentDispositionAttachment(meta?.xlsxFilename ?? `${req.params.type}.xlsx`),
  );
  res.send(buf);
});
