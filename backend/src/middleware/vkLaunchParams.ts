import type { Request } from 'express';

export type VkLaunchParams = Record<string, string>;

export interface VkSignedRequest extends Request {
  vkLaunchParams?: VkLaunchParams;
}

export function getVkLaunchParams(req: Request): VkLaunchParams | undefined {
  return (req as VkSignedRequest).vkLaunchParams;
}

export function getSignedVkUserId(req: Request): string | null {
  const userId = getVkLaunchParams(req)?.vk_user_id;
  return userId != null && userId !== '' ? userId : null;
}
