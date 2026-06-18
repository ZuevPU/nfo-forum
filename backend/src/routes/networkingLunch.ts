import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import {
  applyNetworkingLunch,
  getUserLunchStatus,
} from '../services/networkingLunch.service.js';

export const networkingLunchRouter = Router();

networkingLunchRouter.post('/apply', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await applyNetworkingLunch(req.user!.id);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Apply failed';
    res.status(400).json({ error: message });
  }
});

networkingLunchRouter.get('/my-status', requireUser, async (req: AuthenticatedRequest, res) => {
  const status = await getUserLunchStatus(req.user!.id);
  res.json({ status });
});
