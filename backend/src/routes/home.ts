import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import { getHomeData, submitFeedback } from '../services/home.service.js';

export const homeRouter = Router();

homeRouter.get('/', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const data = await getHomeData(req.user!);
    void logActivity(req.user!.id, 'view_home');
    res.json(data);
  } catch (error) {
    console.error('Home error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

homeRouter.post('/feedback', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    await submitFeedback(req.user!.id, text);
    res.json({ ok: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
