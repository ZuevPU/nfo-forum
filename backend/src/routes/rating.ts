import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import { getPointsHistory, getRating, getReflectionLevelHistory } from '../services/rating.service.js';
import { getReflectionLevelSettings } from '../services/reflectionLevelSettings.service.js';

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

ratingRouter.get('/history', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const history = await getPointsHistory(req.user!.id);
    res.json({
      history: history.map((h) => ({
        id: h.id,
        points: h.points,
        source: h.source,
        comment: h.comment,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Points history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

ratingRouter.get('/reflection-level', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const history = await getReflectionLevelHistory(req.user!.id);
    const { thresholds } = await getReflectionLevelSettings();
    res.json({
      level: req.user!.reflectionLevel,
      reflectionPoints: req.user!.reflectionPoints,
      thresholds,
      history: history.map((h) => ({
        id: h.id,
        oldLevel: h.oldLevel,
        newLevel: h.newLevel,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Reflection level error:', error);
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
