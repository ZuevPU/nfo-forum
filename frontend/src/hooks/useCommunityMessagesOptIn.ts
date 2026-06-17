import { useCallback, useEffect, useState } from 'react';
import { updateMessagesPermission } from '../api/auth';
import { requestVkMessagesFromGroup } from '../lib/vk-bridge';

const MESSAGES_PERMISSION_KEY = 'nfo_vk_messages_from_group';

function readLocalAllowed(): boolean {
  return localStorage.getItem(MESSAGES_PERMISSION_KEY) === '1';
}

function resolveAllowed(serverAllowed?: boolean): boolean {
  return Boolean(serverAllowed) || readLocalAllowed();
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
  const [checked, setChecked] = useState(() => resolveAllowed(serverAllowed));

  useEffect(() => {
    setChecked(resolveAllowed(serverAllowed));
  }, [serverAllowed]);

  const toggle = useCallback(
    async (enabled: boolean) => {
      if (loading) return;
      setHint(null);
      setLoading(true);

      try {
        if (!enabled) {
          setChecked(false);
          localStorage.removeItem(MESSAGES_PERMISSION_KEY);
          if (persist) {
            await updateMessagesPermission(false);
            onSuccess?.();
          }
          return;
        }

        const vkAllowed = await requestVkMessagesFromGroup(true);
        if (!vkAllowed) {
          setChecked(false);
          setHint('Нажми «Разрешить» во всплывающем окне VK — без этого напоминания не придут.');
          return;
        }

        setChecked(true);
        if (persist) {
          await updateMessagesPermission(true);
          onSuccess?.();
        }
      } catch (e) {
        console.error(e);
        setChecked(resolveAllowed(serverAllowed));
        setHint('Не удалось сохранить. Попробуй ещё раз.');
      } finally {
        setLoading(false);
      }
    },
    [loading, persist, onSuccess, serverAllowed],
  );

  return { allowed: checked, loading, hint, toggle, localPreAuthorized: readLocalAllowed() };
}

export { MESSAGES_PERMISSION_KEY };
