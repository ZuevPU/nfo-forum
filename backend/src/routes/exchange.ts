import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import {
  addReaction,
  createAnswer,
  createQuestion,
  deferAssignment,
  getFeed,
  getIncoming,
  getQuestionWithAnswers,
  markExchangeSeen,
  reportAnswer,
  skipAssignment,
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

exchangeRouter.get('/incoming', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const incoming = await getIncoming(req.user!);
    res.json({ incoming });
  } catch (error) {
    console.error('Incoming error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.get('/feed', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const feedScope = (req.query.scope as 'all' | 'track') ?? 'all';
    const feed = await getFeed(req.user!, feedScope);
    await markExchangeSeen(req.user!.id);
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
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (
      message === 'Question not found' ||
      message === 'Question is not available' ||
      message === 'Question is not available for your track' ||
      message === 'Already answered'
    ) {
      res.status(400).json({ error: message });
      return;
    }
    console.error('Create answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.post('/assignments/:id/skip', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    await skipAssignment(req.user!, id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Skip assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.post('/assignments/:id/defer', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    await deferAssignment(req.user!, id);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Assignment not found') {
      res.status(404).json({ error: message });
      return;
    }
    console.error('Defer assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exchangeRouter.get('/questions/:id', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const data = await getQuestionWithAnswers(id, req.user!);
    if (!data) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    if (data.question.isMine) {
      await markExchangeSeen(req.user!.id);
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

exchangeRouter.post('/reports', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { answer_id } = req.body as { answer_id?: number };
    if (!answer_id) {
      res.status(400).json({ error: 'answer_id is required' });
      return;
    }
    const result = await reportAnswer(req.user!, answer_id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Report error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});
