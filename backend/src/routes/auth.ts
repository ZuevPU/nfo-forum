import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireUser, type AuthenticatedRequest } from '../middleware/requireUser.js';
import type { RegisterRequest } from '../types/api.js';
import {
  AuthConflictError,
  AuthValidationError,
  loginByVkId,
  registerUser,
  deleteUserAccount,
} from '../services/auth.service.js';

export const authRouter = Router();

const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyFn: (req) => `auth:${req.ip ?? 'unknown'}`,
});

authRouter.post('/login', authRateLimit, async (req, res) => {
  try {
    const vkId = req.body?.vk_id ?? req.body?.vkId;

    if (!vkId || typeof vkId !== 'string') {
      res.status(400).json({ error: 'vk_id is required' });
      return;
    }

    const firstName = req.body?.first_name ?? req.body?.firstName;
    const lastName = req.body?.last_name ?? req.body?.lastName;
    const result = await loginByVkId(vkId, {
      firstName: typeof firstName === 'string' ? firstName : undefined,
      lastName: typeof lastName === 'string' ? lastName : undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/register', authRateLimit, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;

    const data: RegisterRequest = {
      vkId: String(body.vk_id ?? body.vkId ?? ''),
      firstName: String(body.first_name ?? body.firstName ?? ''),
      lastName: body.last_name != null ? String(body.last_name) : body.lastName != null ? String(body.lastName) : undefined,
      track: String(body.track ?? '') as RegisterRequest['track'],
    };

    const user = await registerUser(data);
    res.status(201).json({ user });
  } catch (error) {
    if (error instanceof AuthValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof AuthConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }

    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.delete('/account', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    await deleteUserAccount(req.user!.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/notifications', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled is required' });
      return;
    }
    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    await db.update(users).set({ notificationsEnabled: enabled }).where(eq(users.id, req.user!.id));
    res.json({ ok: true, enabled });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
