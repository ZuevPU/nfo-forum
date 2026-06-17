import {
  Button,
  Div,
  Group,
  Placeholder,
  PullToRefresh,
  SimpleCell,
} from '@vkontakte/vkui';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../api/notifications';
import { PanelLayout } from '../components/PanelLayout';
import { routeFromFragment } from '../lib/deepLink';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsPanel() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchNotifications()
      .then((r) => {
        setItems(r.items);
        setUnreadCount(r.unreadCount);
      })
      .catch(() => setError('Не удалось загрузить уведомления'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore — переход всё равно выполним
      }
    }

    if (item.linkHash) {
      const route = routeFromFragment(item.linkHash);
      if (route) {
        navigate(route);
        return;
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      setError('Не удалось отметить все как прочитанные');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <PanelLayout
      id="notifications"
      title="Уведомления"
      subtitle={unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все прочитано'}
      useGradient
      backToHome
      loading={loading}
      error={error}
    >
      <PullToRefresh onRefresh={() => load()} isFetching={loading}>
        {unreadCount > 0 && (
          <Div>
            <Button
              size="l"
              mode="secondary"
              className="nfo-btn-gray-blue"
              stretched
              loading={markingAll}
              onClick={() => void handleMarkAllRead()}
            >
              Прочитать все
            </Button>
          </Div>
        )}

        <Group>
          {items.length === 0 ? (
            <Placeholder>Пока нет уведомлений</Placeholder>
          ) : (
            items.map((item) => {
              const unread = !item.readAt;
              const subtitle = [
                formatTime(item.createdAt),
                item.linkLabel ?? (item.linkHash ? 'Перейти' : null),
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <SimpleCell
                  key={item.id}
                  multiline
                  subtitle={subtitle}
                  onClick={() => void handleItemClick(item)}
                  style={
                    unread
                      ? { background: 'rgba(79, 107, 255, 0.06)', fontWeight: 500 }
                      : undefined
                  }
                >
                  {item.text}
                </SimpleCell>
              );
            })
          )}
        </Group>
      </PullToRefresh>
    </PanelLayout>
  );
}
