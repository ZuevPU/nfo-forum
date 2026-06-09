import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export function cronAuth(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-cron-secret'] ?? req.query.secret;
  if (secret !== env.CRON_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
