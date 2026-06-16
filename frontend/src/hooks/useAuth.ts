import { useCallback, useEffect, useState } from 'react';
import { login, register, deleteAccount } from '../api/auth';
import { ApiPausedError } from '../api/client';
import type { Track } from '../constants/tracks';
import { DEV_VK_ID, getLaunchParams, getVkUserInfo } from '../lib/vk-bridge';
import type { AuthStatus, UserDto, VkUserInfo } from '../types/auth';

interface UseAuthResult {
  status: AuthStatus;
  user: UserDto | null;
  vkUserInfo: VkUserInfo | null;
  error: string | null;
  registerUser: (track: Track) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  retry: () => void;
}

export function useAuth(): UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const vkUserInfo = getVkUserInfo();

  const authenticate = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const launchParams = getLaunchParams();
      const info = getVkUserInfo();

      const vkId = import.meta.env.DEV && launchParams.vk_user_id != null && !window.location.search.includes('vk_user_id')
        ? DEV_VK_ID
        : launchParams.vk_user_id != null
          ? String(launchParams.vk_user_id)
          : info?.id != null
            ? String(info.id)
            : null;

      if (!vkId) {
        throw new Error('vk_user_id not found in launch params');
      }

      const result = await login(vkId, {
        firstName: info?.first_name,
        lastName: info?.last_name,
      });

      if (result.registered) {
        setUser(result.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('needs_registration');
      }
    } catch (err) {
      if (err instanceof ApiPausedError) {
        return;
      }

      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void authenticate();
  }, [authenticate, attempt]);

  const registerUser = useCallback(
    async (track: Track) => {
      setStatus('loading');
      setError(null);

      try {
        const launchParams = getLaunchParams();
        const info = getVkUserInfo();

        const vkId = import.meta.env.DEV && launchParams.vk_user_id != null && !window.location.search.includes('vk_user_id')
          ? DEV_VK_ID
          : launchParams.vk_user_id != null
            ? String(launchParams.vk_user_id)
            : info?.id != null
              ? String(info.id)
              : null;

        if (!vkId || !info) {
          throw new Error('User info is not available');
        }

        const { user: created } = await register({
          vkId,
          firstName: info.first_name,
          lastName: info.last_name,
          track,
        });

        setUser(created);
        setStatus('authenticated');
      } catch (err) {
        if (err instanceof ApiPausedError) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        setStatus('needs_registration');
      }
    },
    [],
  );

  const deleteUserAccountFunc = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      await deleteAccount();
      setUser(null);
      setStatus('needs_registration');
    } catch (err) {
      if (err instanceof ApiPausedError) return;
      const message = err instanceof Error ? err.message : 'Deletion failed';
      setError(message);
      setStatus('authenticated');
    }
  }, []);

  const retry = useCallback(() => {
    setAttempt((prev) => prev + 1);
  }, []);

  const refreshUser = useCallback(async () => {
    const launchParams = getLaunchParams();
    const info = getVkUserInfo();
    const vkId = launchParams.vk_user_id != null ? String(launchParams.vk_user_id) : info?.id != null ? String(info.id) : null;
    if (!vkId) return;
    const result = await login(vkId, { firstName: info?.first_name, lastName: info?.last_name });
    if (result.registered) setUser(result.user);
  }, []);

  return {
    status,
    user,
    vkUserInfo,
    error,
    registerUser,
    deleteUserAccount: deleteUserAccountFunc,
    refreshUser,
    retry,
  };
}
