import { useCallback, useEffect, useState } from 'react';
import { updateMessagesPermission } from '../api/auth';
import { requestVkMessagesFromGroup } from '../lib/vk-bridge';

const MESSAGES_PERMISSION_KEY = 'nfo_vk_messages_from_group';

function readLocalAllowed(): boolean {
  return localStorage.getItem(MESSAGES_PERMISSION_KEY) === '1';
}

interface Options {
  /** Сохранять в API (нужен залогиненный пользователь) */
  persist?: boolean;
  /** Текущее значение с сервера */
  serverAllowed?: boolean;
  onSuccess?: () => void;
}

export function useCommunityMessagesOptIn(options: Options = {}) {
  const { persist = false, serverAllowed, onSuccess } = options;
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [localAllowed, setLocalAllowed] = useState(() => Boolean(serverAllowed) || readLocalAllowed());

  const allowed = persist
    ? Boolean(serverAllowed) || localAllowed
    : localAllowed;

  useEffect(() => {
    if (serverAllowed) setLocalAllowed(true);
  }, [serverAllowed]);

  const toggle = useCallback(
    async (enabled: boolean) => {
      setHint(null);
      setLoading(true);
      try {
        if (enabled) {
          const vkAllowed = await requestVkMessagesFromGroup(true);
          const localGranted = readLocalAllowed();
          if (!vkAllowed && !localGranted) {
            setHint('Нажми «Разрешить» во всплывающем окне VK — без этого напоминания не придут.');
            return;
          }
          setLocalAllowed(true);
          if (persist) {
            await updateMessagesPermission(true);
            onSuccess?.();
          }
        } else {
          localStorage.removeItem(MESSAGES_PERMISSION_KEY);
          setLocalAllowed(false);
          if (persist) {
            await updateMessagesPermission(false);
            onSuccess?.();
          }
        }
      } catch (e) {
        console.error(e);
        setHint('Не удалось сохранить. Попробуй ещё раз.');
      } finally {
        setLoading(false);
      }
    },
    [persist, onSuccess],
  );

  return { allowed, loading, hint, toggle, localPreAuthorized: readLocalAllowed() };
}

export { MESSAGES_PERMISSION_KEY };
