import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import {
  getBlocks,
  getProgress,
  isTrainerTrack,
  saveAnswer,
} from '../services/diagnostics.service.js';

export const diagnosticsRouter = Router();

diagnosticsRouter.get('/blocks', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isTrainerTrack(req.user!.track)) {
      res.status(403).json({ error: 'Diagnostics available only for trainer tracks' });
      return;
    }
    const blocks = await getBlocks();
    res.json({ blocks });
  } catch (error) {
    console.error('Diagnostics blocks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

diagnosticsRouter.post('/answers', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isTrainerTrack(req.user!.track)) {
      res.status(403).json({ error: 'Diagnostics available only for trainer tracks' });
      return;
    }
    const { block_id, question_id, score } = req.body as {
      block_id?: number;
      question_id?: number;
      score?: number;
    };
    if (block_id == null || question_id == null || score == null) {
      res.status(400).json({ error: 'block_id, question_id and score are required' });
      return;
    }
    const answer = await saveAnswer(req.user!, block_id, question_id, score);
    res.status(201).json({ answer });
  } catch (error) {
    console.error('Diagnostics answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

diagnosticsRouter.get('/progress', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const progress = await getProgress(req.user!.id);
    res.json({ progress });
  } catch (error) {
    console.error('Diagnostics progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
