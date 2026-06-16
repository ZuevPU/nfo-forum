import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { applyNetworking, getDailyFocus, getTask, getTasks, submitTask } from '../services/tasks.service.js';
import { logActivity } from '../services/activity.service.js';

export const tasksRouter = Router();

const submitRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyFn: (req) => {
    const vkId = req.headers['x-vk-id'];
    return `submit:${typeof vkId === 'string' ? vkId : req.ip ?? 'unknown'}`;
  },
});

tasksRouter.get('/', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const tasks = await getTasks(req.user!);
    res.json({ tasks });
  } catch (error) {
    console.error('Tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

tasksRouter.get('/focus', requireUser, async (_req: AuthenticatedRequest, res) => {
  try {
    const focus = await getDailyFocus();
    res.json({ focus });
  } catch (error) {
    console.error('Daily focus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

tasksRouter.get('/:id', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const task = await getTask(Number(req.params.id), req.user!.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    console.error('Task detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

tasksRouter.post('/:id/apply-networking', requireUser, submitRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await applyNetworking(req.user!, Number(req.params.id));
    res.status(201).json({ networking: result });
  } catch (error) {
    console.error('Networking apply error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});

tasksRouter.post('/:id/submit', requireUser, submitRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const { answer_text, photos } = req.body as {
      answer_text?: string;
      photos?: string[];
    };
    const result = await submitTask(
      req.user!,
      Number(req.params.id),
      answer_text,
      photos,
    );
    await logActivity(req.user!.id, 'submit_task');
    res.status(201).json({ submission: result });
  } catch (error) {
    console.error('Task submit error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});
