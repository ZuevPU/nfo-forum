import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import {
  addReaction,
  createAnswer,
  createQuestion,
  getFeed,
  getIncoming,
  getQuestionWithAnswers,
} from '../services/exchange.service.js';

export const exchangeRouter = Router();

const submitRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyFn: (req) => {
    const vkId = req.headers['x-vk-id'];
    return `exchange:${typeof vkId === 'string' ? vkId : req.ip ?? 'unknown'}`;
  },
});

exchangeRouter.get('/feed', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const feed = await getFeed(req.user!);
    await logActivity(req.user!.id, 'view_exchange');
    res.json({ feed });
  } catch (error) {
    console.error('Exchange feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.post('/questions', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { text, scope = 'all' } = req.body as { text?: string; scope?: 'all' | 'track' };
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const result = await createQuestion(req.user!, text, scope);
    await logActivity(req.user!.id, 'ask_exchange');
    res.status(201).json(result);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.post('/answers', requireUser, submitRateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const { question_id, answer_text } = req.body as {
      question_id?: number;
      answer_text?: string;
    };
    if (!question_id || !answer_text) {
      res.status(400).json({ error: 'question_id and answer_text are required' });
      return;
    }
    const answer = await createAnswer(req.user!, question_id, answer_text);
    await logActivity(req.user!.id, 'answer_exchange');
    res.status(201).json({ answer });
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.get('/incoming', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const incoming = await getIncoming(req.user!);
    res.json({ incoming });
  } catch (error) {
    console.error('Incoming error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.get('/questions/:id', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const data = await getQuestionWithAnswers(id, req.user!.id);
    if (!data) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error('Question detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.post('/reactions', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { answer_id, reaction_type = 'like' } = req.body as {
      answer_id?: number;
      reaction_type?: string;
    };
    if (!answer_id) {
      res.status(400).json({ error: 'answer_id is required' });
      return;
    }
    await addReaction(req.user!, answer_id, reaction_type);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
