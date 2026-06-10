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
  moderateSubmission,
  updateEvent,
  updateTask,
} from '../services/admin.service.js';
import { sendPush } from '../services/push.service.js';

export const adminRouter = Router();

adminRouter.use(requireUser, requireAdmin);

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
  const { status } = req.body as { status?: 'approved' | 'rejected' };
  if (!status) {
    res.status(400).json({ error: 'status required' });
    return;
  }
  const question = await moderateExchangeQuestion(Number(req.params.id), status);
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
  const { text, image, target_type, target_tracks, target_user_id } = req.body as {
    text?: string;
    image?: string;
    target_type?: 'all' | 'track' | 'user';
    target_tracks?: string[];
    target_user_id?: number;
  };
  if (!text || !target_type) {
    res.status(400).json({ error: 'text and target_type are required' });
    return;
  }
  const result = await sendPush({
    text,
    image,
    targetType: target_type,
    targetTracks: target_tracks,
    targetUserId: target_user_id,
  });
  res.json(result);
});
