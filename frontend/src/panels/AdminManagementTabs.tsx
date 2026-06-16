import { Button, Div, FormItem, Group, Input, NativeSelect, SimpleCell } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  adjustUserPoints,
  fetchAdminUsers,
  fetchFeedbackMessages,
  fetchPointsSettings,
  getAdminExportUrl,
  savePointsSettings,
  type AdminUser,
  type FeedbackMessage,
} from '../api/admin';
import { TRACKS } from '../constants/tracks';

export function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trackFilter, setTrackFilter] = useState('');
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustPoints, setAdjustPoints] = useState('10');
  const [adjustComment, setAdjustComment] = useState('');

  const load = () => {
    fetchAdminUsers(trackFilter || undefined).then((r) => setUsers(r.users)).catch(console.error);
  };

  useEffect(() => { load(); }, [trackFilter]);

  return (
    <Group header="Участники">
      <FormItem top="Фильтр по треку">
        <NativeSelect value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)}>
          <option value="">Все</option>
          {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
        </NativeSelect>
      </FormItem>
      {users.map((u) => (
        <SimpleCell key={u.id} subtitle={`${u.track ?? '—'} · ${u.points} б.`} multiline>
          {u.firstName} {u.lastName ?? ''}
        </SimpleCell>
      ))}
      <FormItem top="ID участника">
        <Input value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} />
      </FormItem>
      <FormItem top="Баллы (+/-)">
        <Input type="number" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} />
      </FormItem>
      <FormItem top="Комментарий">
        <Input value={adjustComment} onChange={(e) => setAdjustComment(e.target.value)} />
      </FormItem>
      <Div>
        <Button size="m" onClick={() => void adjustUserPoints(Number(adjustUserId), Number(adjustPoints), adjustComment).then(load)}>
          Скорректировать баллы
        </Button>
      </Div>
    </Group>
  );
}

export function AdminFeedbackTab() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  useEffect(() => {
    fetchFeedbackMessages().then((r) => setMessages(r.messages)).catch(console.error);
  }, []);

  return (
    <Group header="Сообщения от участников">
      {messages.map((m) => (
        <SimpleCell key={m.id} subtitle={new Date(m.createdAt).toLocaleString('ru-RU')} multiline>
          <strong>{m.firstName} {m.lastName ?? ''}</strong> ({m.track ?? '—'})
          <div style={{ marginTop: 4 }}>{m.text}</div>
        </SimpleCell>
      ))}
      {!messages.length && <Div>Нет сообщений</Div>}
    </Group>
  );
}

export function AdminSettingsTab() {
  const [config, setConfig] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchPointsSettings().then((r) => setConfig(r.config)).catch(console.error);
  }, []);

  return (
    <Group header="Баллы за действия">
      {Object.entries(config).map(([key, value]) => (
        <FormItem key={key} top={key}>
          <Input
            type="number"
            value={String(value)}
            onChange={(e) => setConfig((c) => ({ ...c, [key]: Number(e.target.value) }))}
          />
        </FormItem>
      ))}
      <Div>
        <Button size="m" onClick={() => void savePointsSettings(config)}>Сохранить</Button>
      </Div>
      <Group header="Выгрузки CSV">
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['reflection', 'tasks', 'exchange', 'rating', 'checkins', 'nfo-day', 'points-history'] as const).map((type) => (
            <Button key={type} size="s" mode="secondary" href={getAdminExportUrl(type)} target="_blank">
              {type}
            </Button>
          ))}
        </Div>
      </Group>
    </Group>
  );
}
