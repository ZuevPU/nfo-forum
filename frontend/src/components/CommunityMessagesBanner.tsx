import { Button, Div } from '@vkontakte/vkui';
import { useState } from 'react';
import { updateMessagesPermission } from '../api/auth';
import { requestVkMessagesFromGroup } from '../lib/vk-bridge';

interface Props {
  onEnabled: () => void;
}

export function CommunityMessagesBanner({ onEnabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleEnable = async () => {
    setHint(null);
    setLoading(true);
    try {
      const allowed = await requestVkMessagesFromGroup(true);
      if (!allowed) {
        setHint('Разреши сообщения от сообщества во всплывающем окне VK.');
        return;
      }
      await updateMessagesPermission(true);
      onEnabled();
    } catch (e) {
      console.error(e);
      setHint('Не удалось включить. Попробуй ещё раз или открой Настройки.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Div style={{ padding: '8px 16px 0' }}>
      <div
        style={{
          background: '#fff8e6',
          border: '1px solid #f0d78c',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#8a6d1d' }}>
          Включи уведомления от сообщества
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45, color: '#6b5a2a' }}>
          Без разрешения личных сообщений от Форума НФО ты не будешь получать напоминания о заданиях,
          расписании и рассылках.
        </div>
        <Button
          size="m"
          mode="primary"
          stretched
          style={{ marginTop: 12 }}
          loading={loading}
          onClick={() => void handleEnable()}
        >
          Разрешить сообщения
        </Button>
        {hint && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#c0392b' }}>{hint}</div>
        )}
      </div>
    </Div>
  );
}
