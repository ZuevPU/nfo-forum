import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import {
  getEveningQuestions,
  getNfoDayConfig,
  getNfoDayReflectionToday,
  getQuestions,
  submitAnswer,
  submitNfoDayReflection,
} from '../services/reflection.service.js';

export const reflectionRouter = Router();

reflectionRouter.get('/questions', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const questions = await getQuestions(req.user!);
    res.json({ questions });
  } catch (error) {
    console.error('Reflection questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

reflectionRouter.post('/answers', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { question_id, answer_text } = req.body as {
      question_id?: number;
      answer_text?: string;
    };
    if (!question_id || !answer_text) {
      res.status(400).json({ error: 'question_id and answer_text are required' });
      return;
    }
    const answer = await submitAnswer(req.user!, question_id, answer_text);
    await logActivity(req.user!.id, 'answer_reflection');
    res.status(201).json({ answer });
  } catch (error) {
    console.error('Reflection answer error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});

reflectionRouter.get('/evening', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const questions = await getEveningQuestions(req.user!);
    res.json({ questions });
  } catch (error) {
    console.error('Evening reflection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

reflectionRouter.get('/nfo-day/config', requireUser, async (_req, res) => {
  try {
    const config = await getNfoDayConfig();
    res.json(config);
  } catch (error) {
    console.error('NFO day config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

reflectionRouter.post('/nfo-day', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { answer_text, factors } = req.body as {
      answer_text?: string;
      factors?: string[];
    };
    if (!answer_text || !factors?.length) {
      res.status(400).json({ error: 'answer_text and factors are required' });
      return;
    }
    const reflection = await submitNfoDayReflection(req.user!, answer_text, factors);
    await logActivity(req.user!.id, 'nfo_day_submit');
    res.status(201).json({ reflection });
  } catch (error) {
    console.error('NFO day reflection error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});

reflectionRouter.get('/nfo-day/today', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const reflection = await getNfoDayReflectionToday(req.user!.id);
    res.json({
      reflection: reflection
        ? {
            answerText: reflection.answerText,
            factors: reflection.factors,
            createdAt: reflection.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error('NFO day today error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
