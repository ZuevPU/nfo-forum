import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import {
  createCheckin,
  getCheckinHistory,
  getCheckinStatus,
  getTodayCheckins,
} from '../services/state.service.js';

export const stateRouter = Router();

stateRouter.post('/checkin', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { emotion, energy_level, comment } = req.body as {
      emotion?: string;
      energy_level?: number;
      comment?: string;
    };
    if (!emotion || energy_level == null) {
      res.status(400).json({ error: 'emotion and energy_level are required' });
      return;
    }
    const result = await createCheckin(req.user!, emotion, energy_level, comment);
    await logActivity(req.user!.id, 'state_checkin');
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const knownErrors = [
      'Чек-ин недоступен для вашего трека',
      'Чек-ин сейчас закрыт',
      'Вы уже отметились в этом слоте',
    ];
    if (knownErrors.includes(message)) {
      res.status(400).json({ error: message });
      return;
    }
    console.error('Checkin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

stateRouter.get('/checkin-status', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const status = await getCheckinStatus(req.user!);
    res.json({ status });
  } catch (error) {
    console.error('Checkin status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

stateRouter.get('/today', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const checkins = await getTodayCheckins(req.user!.id);
    res.json({ checkins });
  } catch (error) {
    console.error('Today checkins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

stateRouter.get('/history', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const checkins = await getCheckinHistory(req.user!.id);
    res.json({ checkins });
  } catch (error) {
    console.error('Checkin history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
