import { createHmac } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import type { VkSignedRequest } from './vkLaunchParams.js';

const EXEMPT_PATHS = ['/api/health'];

function buildSignString(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => key.startsWith('vk_'))
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
}

function extractVkParams(req: Request): Record<string, string> {
  const vkParams: Record<string, string> = {};

  const raw = req.body as Record<string, unknown>;
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (key.startsWith('vk_') && value != null) {
      vkParams[key] = String(value);
    }
  }

  for (const [key, value] of Object.entries(req.headers)) {
    if (!key.startsWith('x-vk-') || key === 'x-vk-sign' || key === 'x-vk-id') continue;
    const vkKey = `vk_${key.slice(5)}`;
    if (Array.isArray(value)) {
      vkParams[vkKey] = value[0] ?? '';
    } else if (value != null) {
      vkParams[vkKey] = String(value);
    }
  }

  return vkParams;
}

function isExempt(path: string): boolean {
  return EXEMPT_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export function validateVkSign(req: Request, res: Response, next: NextFunction) {
  if (isExempt(req.path)) {
    next();
    return;
  }

  if (!env.VK_APP_SECRET || env.SKIP_VK_SIGN) {
    next();
    return;
  }

  const vkParams = extractVkParams(req);
  let sign = (req.headers['x-vk-sign'] as string) ?? (req.body as Record<string, string>)?.sign;

  // Извлекаем параметры из заголовка Authorization, если он есть
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('VK ')) {
    const query = new URLSearchParams(authHeader.slice(3));
    for (const [key, value] of query.entries()) {
      if (key.startsWith('vk_')) {
        vkParams[key] = value;
      } else if (key === 'sign') {
        sign = value;
      }
    }
  }

  // #region agent log
  if (req.path === '/api/auth/login') {
    const secret = env.VK_APP_SECRET || '';
    console.log(`[AUTH DEBUG] VK_APP_SECRET length on server: ${secret.length}. Expected: 20`);
    console.log(`[AUTH DEBUG] Does secret end with space? ${secret.endsWith(' ')}`);
    console.log(`[AUTH DEBUG] Auth header present: ${!!authHeader}`);
  }
  // #endregion

  if (!sign || Object.keys(vkParams).length === 0) {
    res.status(403).json({ error: 'VK signature required' });
    return;
  }

  const baseString = buildSignString(vkParams);
  const expected = createHmac('sha256', env.VK_APP_SECRET)
    .update(baseString)
    .digest('base64url')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  if (sign !== expected) {
    res.status(403).json({ error: 'Invalid VK signature' });
    return;
  }

  (req as VkSignedRequest).vkLaunchParams = vkParams;
  next();
}
