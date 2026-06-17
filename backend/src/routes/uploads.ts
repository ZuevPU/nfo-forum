import { Router } from 'express';
import { requireUser, type AuthenticatedRequest } from '../middleware/requireUser.js';
import { saveFromDataUrl, saveFromUrl } from '../services/media.service.js';

export const uploadsRouter = Router();

uploadsRouter.use(requireUser);

uploadsRouter.post('/image', async (req: AuthenticatedRequest, res) => {
  const { image } = req.body as { image?: string };
  if (!image || typeof image !== 'string') {
    res.status(400).json({ error: 'image is required' });
    return;
  }
  try {
    const result = await saveFromDataUrl(image, 'upload');
    res.json({ url: result.url, mediaId: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(400).json({ error: message });
  }
});

uploadsRouter.post('/from-url', async (req: AuthenticatedRequest, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  try {
    const result = await saveFromUrl(url.trim());
    res.json({ url: result.url, mediaId: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(400).json({ error: message });
  }
});
