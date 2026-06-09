import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyFn?.(req) ?? req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    bucket.count += 1;
    next();
  };
}
