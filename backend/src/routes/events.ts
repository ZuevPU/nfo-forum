import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import { getCurrentEvent, getEvents } from '../services/events.service.js';

export const eventsRouter = Router();

eventsRouter.get('/', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const track = (req.query.track as string) ?? req.user!.track ?? 'all';
    const day = req.query.day as string | undefined;
    const events = await getEvents(track === 'all' ? null : track, day);
    await logActivity(req.user!.id, 'open_schedule');
    res.json({ events });
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

eventsRouter.get('/current', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const event = await getCurrentEvent(req.user!.track);
    res.json({ event });
  } catch (error) {
    console.error('Current event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
