import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  getDilemmasSummary,
  listDilemmas,
  getDilemmaDetail,
  voteDilemma,
  adminListDilemmas,
  adminCreateDilemma,
  adminUpdateDilemma,
  adminDeleteDilemma,
  adminGetDilemmaResults,
  adminPublishDilemma,
  adminUnpublishDilemma,
  adminSendDilemmaNotification,
} from '../services/dilemmas.service.js';

export const dilemmasRouter = Router();

const voteRateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyFn: (req) => {
    const vkId = req.headers['x-vk-id'];
    return `dilemma-vote:${typeof vkId === 'string' ? vkId : req.ip ?? 'unknown'}`;
  },
});

dilemmasRouter.get('/summary', requireUser, async (req: AuthenticatedRequest, res) => {
  const summary = await getDilemmasSummary(req.user!.id);
  res.json(summary);
});

// Admin routes must come before /:id to avoid conflicts
dilemmasRouter.get('/admin/all', requireUser, requireAdmin, async (_req, res) => {
  const items = await adminListDilemmas();
  res.json({ dilemmas: items });
});

dilemmasRouter.post('/admin/create', requireUser, requireAdmin, async (req, res) => {
  const data = req.body as {
    text: string;
    optionA: string;
    optionB: string;
    publishedAt: string;
    pointsPerVote?: number;
  };
  if (!data.text || !data.optionA || !data.optionB || !data.publishedAt) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const created = await adminCreateDilemma(data);
  res.status(201).json({ dilemma: created });
});

dilemmasRouter.put('/admin/:id', requireUser, requireAdmin, async (req, res) => {
  const updated = await adminUpdateDilemma(
    Number(req.params.id),
    req.body as { text?: string; optionA?: string; optionB?: string; publishedAt?: string; pointsPerVote?: number },
  );
  res.json({ dilemma: updated });
});

dilemmasRouter.delete('/admin/:id', requireUser, requireAdmin, async (req, res) => {
  await adminDeleteDilemma(Number(req.params.id));
  res.json({ ok: true });
});

dilemmasRouter.get('/admin/:id/results', requireUser, requireAdmin, async (req, res) => {
  const results = await adminGetDilemmaResults(Number(req.params.id));
  if (!results) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(results);
});

dilemmasRouter.post('/admin/:id/publish', requireUser, requireAdmin, async (req, res) => {
  try {
    const updated = await adminPublishDilemma(Number(req.params.id));
    res.json({ dilemma: updated });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
  }
});

dilemmasRouter.post('/admin/:id/unpublish', requireUser, requireAdmin, async (req, res) => {
  try {
    const updated = await adminUnpublishDilemma(Number(req.params.id));
    res.json({ dilemma: updated });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
  }
});

dilemmasRouter.post('/admin/:id/notify', requireUser, requireAdmin, async (req, res) => {
  try {
    const result = await adminSendDilemmaNotification(Number(req.params.id));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
  }
});

dilemmasRouter.get('/', requireUser, async (req: AuthenticatedRequest, res) => {
  const items = await listDilemmas(req.user!.id);
  res.json({ dilemmas: items });
});

dilemmasRouter.get('/:id', requireUser, async (req: AuthenticatedRequest, res) => {
  const detail = await getDilemmaDetail(Number(req.params.id), req.user!.id);
  if (!detail) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(detail);
});

dilemmasRouter.post('/:id/vote', requireUser, voteRateLimit, async (req: AuthenticatedRequest, res) => {
  const { chosen_option, comment } = req.body as { chosen_option?: string; comment?: string };
  if (chosen_option !== 'a' && chosen_option !== 'b') {
    res.status(400).json({ error: 'chosen_option must be "a" or "b"' });
    return;
  }
  try {
    const vote = await voteDilemma(req.user!, Number(req.params.id), chosen_option, comment);
    res.status(201).json({ vote });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error' });
  }
});
