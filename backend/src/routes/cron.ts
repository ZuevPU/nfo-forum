import { Router } from 'express';
import { cronAuth } from '../middleware/cronAuth.js';
import { listCronJobs, runCronJob } from '../services/cron.service.js';
import { sendPush } from '../services/push.service.js';

export const cronRouter = Router();

cronRouter.use(cronAuth);

cronRouter.get('/jobs', (_req, res) => {
  res.json({ jobs: listCronJobs() });
});

cronRouter.post('/:job', async (req, res) => {
  try {
    const result = await runCronJob(req.params.job);
    if (!result.ok) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

cronRouter.post('/push/send', async (req, res) => {
  try {
    const { text, target_type, target_tracks, target_user_id } = req.body as {
      text?: string;
      target_type?: 'all' | 'track' | 'user';
      target_tracks?: string[];
      target_user_id?: number;
    };
    if (!text || !target_type) {
      res.status(400).json({ error: 'text and target_type are required' });
      return;
    }
    const result = await sendPush({
      text,
      targetType: target_type,
      targetTracks: target_tracks,
      targetUserId: target_user_id,
    });
    res.json(result);
  } catch (error) {
    console.error('Push error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
