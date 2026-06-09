import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import { getRating } from '../services/rating.service.js';

export const ratingRouter = Router();

ratingRouter.get('/', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const scope = (req.query.scope as 'track' | 'all') ?? 'track';
    const data = await getRating(scope, req.user!);
    await logActivity(req.user!.id, 'view_rating');
    res.json(data);
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

ratingRouter.get('/me', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const data = await getRating('track', req.user!);
    res.json({ me: data.me });
  } catch (error) {
    console.error('Rating me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
