import { Icon28Notification } from '@vkontakte/icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUnreadCount } from '../api/notifications';
import { useAuthContext } from '../contexts/AuthContext';
import { lifecycleManager } from '../lib/vk-bridge';

const POLL_INTERVAL_MS = 60_000;

interface Props {
  /** Цвет иконки, когда непрочитанных нет (по умолчанию белый — для градиентного заголовка) */
  idleColor?: string;
}

export function NotificationBell({ idleColor = '#fff' }: Props) {
  const navigate = useNavigate();
  const { status } = useAuthContext();
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    fetchUnreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    const unsub = lifecycleManager.subscribe((state) => {
      if (state === 'active') load();
    });
    return () => {
      clearInterval(id);
      unsub();
    };
  }, [status, load]);

  if (status !== 'authenticated') return null;

  const hasUnread = unread > 0;

  return (
    <button
      type="button"
      aria-label="Уведомления"
      onClick={() => navigate('/notifications')}
      style={{
        position: 'relative',
        background: 'transparent',
        border: 'none',
        padding: 4,
        cursor: 'pointer',
        lineHeight: 0,
      }}
    >
      <Icon28Notification fill={hasUnread ? '#e74c3c' : idleColor} />
      {hasUnread && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 8,
            background: '#e74c3c',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
          }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
