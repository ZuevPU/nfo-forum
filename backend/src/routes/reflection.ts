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
  listProgramInsights,
  createProgramInsight,
  getInsightsConfig,
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
    const { responses, answer_text, factors } = req.body as {
      responses?: Record<string, string | string[]>;
      answer_text?: string;
      factors?: string[];
    };
    const payload =
      responses ??
      (answer_text && factors
        ? { thesis: answer_text, understanding: answer_text, factors }
        : null);
    if (!payload) {
      res.status(400).json({ error: 'responses are required' });
      return;
    }
    const reflection = await submitNfoDayReflection(req.user!, payload);
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
            responses: (reflection.answers as Record<string, unknown> | null) ?? null,
            createdAt: reflection.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error('NFO day today error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

reflectionRouter.get('/insights/config', requireUser, async (_req, res) => {
  try {
    res.json(await getInsightsConfig());
  } catch (error) {
    console.error('Insights config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

reflectionRouter.get('/insights', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const insights = await listProgramInsights(req.user!.id);
    res.json({
      insights: insights.map((i) => ({
        id: i.id,
        text: i.text,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Insights list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

reflectionRouter.post('/insights', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const result = await createProgramInsight(req.user!, text);
    res.status(201).json(result);
  } catch (error) {
    console.error('Insight create error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});
