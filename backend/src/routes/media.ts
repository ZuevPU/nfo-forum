import { Router } from 'express';
import { getMedia } from '../services/media.service.js';

export const mediaRouter = Router();

mediaRouter.get('/:id', async (req, res) => {
  const media = await getMedia(req.params.id);
  if (!media) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.setHeader('Content-Type', media.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(media.buffer);
});
