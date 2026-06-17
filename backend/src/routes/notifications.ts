import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
} from '../services/notifications.service.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const [items, unreadCount] = await Promise.all([
      listNotifications(req.user!.id),
      getUnreadCount(req.user!.id),
    ]);
    res.json({ items, unreadCount });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.get('/unread-count', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const count = await getUnreadCount(req.user!.id);
    res.json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.post('/:id/read', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid id' });
      return;
    }
    await markRead(req.user!.id, id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationsRouter.post('/read-all', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    await markAllRead(req.user!.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
