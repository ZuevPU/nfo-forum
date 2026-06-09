import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import { getHomeData } from '../services/home.service.js';

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
