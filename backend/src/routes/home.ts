import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/requireUser.js';
import { requireUser } from '../middleware/requireUser.js';
import { logActivity } from '../services/activity.service.js';
import { getHomeData, submitFeedback } from '../services/home.service.js';

export const homeRouter = Router();

homeRouter.get('/', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const data = await getHomeData(req.user!);
    void logActivity(req.user!.id, 'view_home');
    // #region agent log
    fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'369cd3'},body:JSON.stringify({sessionId:'369cd3',hypothesisId:'schema_mismatch',location:'home.ts:get_success',message:'Successfully fetched home data',data:{userId:req.user!.id},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    res.json(data);
  } catch (error) {
    console.error('Home error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

homeRouter.post('/feedback', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    await submitFeedback(req.user!.id, text);
    res.json({ ok: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
