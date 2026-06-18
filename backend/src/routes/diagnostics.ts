import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import {
  completeAttempt,
  getBlocks,
  getProfileFeedback,
  getProgress,
  isTrainerTrack,
  saveAnswer,
  saveProfileFeedback,
  startNewAttempt,
} from '../services/diagnostics.service.js';
import { logActivity } from '../services/activity.service.js';

export const diagnosticsRouter = Router();

diagnosticsRouter.get('/blocks', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await isTrainerTrack(req.user!.track))) {
      res.status(403).json({ error: 'Diagnostics available only for trainer tracks' });
      return;
    }
    const blocks = await getBlocks();
    await logActivity(req.user!.id, 'view_diagnostics');
    res.json({ blocks });
  } catch (error) {
    console.error('Diagnostics blocks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

diagnosticsRouter.post('/answers', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await isTrainerTrack(req.user!.track))) {
      res.status(403).json({ error: 'Diagnostics available only for trainer tracks' });
      return;
    }
    const { block_id, question_id, score, comment } = req.body as {
      block_id?: number;
      question_id?: number;
      score?: number;
      comment?: string;
    };
    if (block_id == null || score == null) {
      res.status(400).json({ error: 'block_id and score are required' });
      return;
    }
    const answer = await saveAnswer(req.user!, block_id, question_id || 1, score, comment);
    await logActivity(req.user!.id, 'diagnostics_answer');
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

diagnosticsRouter.post('/complete', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await completeAttempt(req.user!.id);
    if (!result.success) {
      res.status(400).json({ error: result.reason });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Diagnostics complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

diagnosticsRouter.post('/start-new', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await isTrainerTrack(req.user!.track))) {
      res.status(403).json({ error: 'Diagnostics available only for trainer tracks' });
      return;
    }
    const attempt = await startNewAttempt(req.user!.id);
    res.json({ attempt });
  } catch (error) {
    console.error('Diagnostics start new attempt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

diagnosticsRouter.get('/profile-feedback', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const feedback = await getProfileFeedback(req.user!.id);
    res.json({ feedback });
  } catch (error) {
    console.error('Diagnostics profile feedback get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

diagnosticsRouter.post('/profile-feedback', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await isTrainerTrack(req.user!.track))) {
      res.status(403).json({ error: 'Diagnostics available only for trainer tracks' });
      return;
    }
    const { comment } = req.body as { comment?: string };
    if (!comment?.trim()) {
      res.status(400).json({ error: 'comment is required' });
      return;
    }
    const feedback = await saveProfileFeedback(req.user!.id, comment);
    res.status(201).json({ feedback });
  } catch (error) {
    console.error('Diagnostics profile feedback error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});
