import type { LoginResponse, RegisterPayload, UserDto } from '../types/auth';
import { apiRequest } from './client';

export async function login(
  vkId: string,
  profile?: { firstName?: string; lastName?: string },
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: {
      vk_id: vkId,
      first_name: profile?.firstName,
      last_name: profile?.lastName,
    },
  });
}

export async function register(payload: RegisterPayload): Promise<{ user: UserDto }> {
  return apiRequest<{ user: UserDto }>('/api/auth/register', {
    method: 'POST',
    body: {
      vk_id: payload.vkId,
      first_name: payload.firstName,
      last_name: payload.lastName,
      track: payload.track,
    },
  });
}

export async function deleteAccount(): Promise<void> {
  await apiRequest<void>('/api/auth/account', {
    method: 'DELETE',
  });
}

export async function updateNotifications(enabled: boolean): Promise<void> {
  await apiRequest<void>('/api/auth/notifications', {
    method: 'POST',
    body: { enabled },
  });
}
