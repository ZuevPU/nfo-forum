import { Button, Div, FormItem, Group, Input, NativeSelect, SimpleCell, Checkbox } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  adjustUserPoints,
  fetchAdminUsers,
  fetchFeedbackMessages,
  fetchPointsSettings,
  fetchReflectionAnswers,
  fetchNfoDayStats,
  fetchCheckinSettings,
  saveCheckinSettings,
  fetchExchangeSlots,
  saveExchangeSlots,
  fetchNfoDaySettings,
  saveNfoDaySettings,
  fetchDailyFocusSettings,
  saveDailyFocusSettings,
  fetchActivityLogs,
  getAdminExportUrl,
  getAdminExportXlsxUrl,
  savePointsSettings,
  type AdminUser,
  type FeedbackMessage,
  type ReflectionAnswerRow,
  type NfoDayStats,
  type ActivityLogRow,
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

export function AdminReflectionAnswersTab() {
  const [answers, setAnswers] = useState<ReflectionAnswerRow[]>([]);
  const [track, setTrack] = useState('');
  const [day, setDay] = useState('');

  const load = () => {
    fetchReflectionAnswers(track || undefined, day || undefined)
      .then((r) => setAnswers(r.answers))
      .catch(console.error);
  };

  useEffect(() => { load(); }, [track, day]);

  return (
    <Group header="Ответы на рефлексию">
      <Div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="s" mode="secondary" href={getAdminExportUrl('reflection')} target="_blank">
          CSV
        </Button>
        <Button size="s" mode="outline" href={getAdminExportXlsxUrl('reflection')} target="_blank">
          XLSX
        </Button>
      </Div>
      <FormItem top="Трек">
        <NativeSelect value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="">Все</option>
          {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
        </NativeSelect>
      </FormItem>
      <FormItem top="Дата (YYYY-MM-DD)">
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </FormItem>
      {answers.map((a) => (
        <SimpleCell key={a.id} subtitle={`${a.track ?? '—'} · ${a.questionType} · ${new Date(a.createdAt).toLocaleString('ru-RU')}`} multiline>
          <strong>{a.userName} {a.userLastName ?? ''}</strong>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>{a.questionText}</div>
          <div style={{ marginTop: 4 }}>{a.answerText}</div>
        </SimpleCell>
      ))}
      {!answers.length && <Div>Нет ответов</Div>}
    </Group>
  );
}

export function AdminNfoStatsTab() {
  const [stats, setStats] = useState<NfoDayStats | null>(null);
  useEffect(() => {
    fetchNfoDayStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <Div>Загрузка...</Div>;

  return (
    <>
      <Group header="Частота факторов">
        {Object.entries(stats.factorCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([factor, count]) => (
            <SimpleCell key={factor} after={count}>{factor}</SimpleCell>
          ))}
      </Group>
      <Group header="Ответы НФО дня">
        {stats.answers.slice(0, 50).map((a, i) => (
          <SimpleCell key={i} subtitle={`${a.track ?? '—'} · ${a.date}`} multiline>
            <strong>{a.userName}</strong>: {a.answerText}
            <div style={{ fontSize: 11, marginTop: 4 }}>{a.factors.join(', ')}</div>
          </SimpleCell>
        ))}
      </Group>
    </>
  );
}

export function AdminActivityTab() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  useEffect(() => {
    fetchActivityLogs().then((r) => setLogs(r.logs)).catch(console.error);
  }, []);

  return (
    <Group header="Журнал активности">
      <Div>
        <Button size="s" mode="secondary" href={getAdminExportUrl('activity')} target="_blank">
          Скачать CSV
        </Button>
      </Div>
      {logs.slice(0, 100).map((l) => (
        <SimpleCell key={l.id} subtitle={new Date(l.createdAt).toLocaleString('ru-RU')}>
          {l.userName} ({l.track ?? '—'}) — {l.action}
        </SimpleCell>
      ))}
    </Group>
  );
}

export function AdminSettingsTab() {
  const [config, setConfig] = useState<Record<string, number>>({});
  const [checkin, setCheckin] = useState<{ enabledTracks: string[]; slots: string[] }>({ enabledTracks: [], slots: [] });
  const [exchangeSlots, setExchangeSlots] = useState<string[]>([]);
  const [nfoDay, setNfoDay] = useState({ publishHour: 19, publishMinute: 30, points: 10 });
  const [dailyFocusTitle, setDailyFocusTitle] = useState('');

  useEffect(() => {
    fetchPointsSettings().then((r) => setConfig(r.config)).catch(console.error);
    fetchCheckinSettings().then(setCheckin).catch(console.error);
    fetchExchangeSlots().then((r) => setExchangeSlots(r.slots)).catch(console.error);
    fetchNfoDaySettings().then(setNfoDay).catch(console.error);
    fetchDailyFocusSettings().then((r) => setDailyFocusTitle(r.title)).catch(console.error);
  }, []);

  return (
    <>
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
          <Button size="m" onClick={() => void savePointsSettings(config)}>Сохранить баллы</Button>
        </Div>
      </Group>

      <Group header="Чек-ин по трекам">
        {TRACKS.map((t) => (
          <Checkbox
            key={t}
            checked={checkin.enabledTracks.includes(t)}
            onChange={(e) => {
              setCheckin((c) => ({
                ...c,
                enabledTracks: e.target.checked
                  ? [...c.enabledTracks, t]
                  : c.enabledTracks.filter((x) => x !== t),
              }));
            }}
          >
            {t}
          </Checkbox>
        ))}
        <FormItem top="Слоты (HH:MM через запятую)">
          <Input
            value={checkin.slots.join(', ')}
            onChange={(e) => setCheckin((c) => ({ ...c, slots: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
          />
        </FormItem>
        <Div>
          <Button size="m" onClick={() => void saveCheckinSettings(checkin)}>Сохранить чек-ин</Button>
        </Div>
      </Group>

      <Group header="Слоты «Обмена опытом»">
        <FormItem top="Время рассылки (HH:MM через запятую)">
          <Input
            value={exchangeSlots.join(', ')}
            onChange={(e) => setExchangeSlots(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </FormItem>
        <Div>
          <Button size="m" onClick={() => void saveExchangeSlots(exchangeSlots)}>Сохранить слоты</Button>
        </Div>
      </Group>

      <Group header="Вопрос дня НФО">
        <FormItem top="Час публикации (MSK)">
          <Input type="number" min={0} max={23} value={String(nfoDay.publishHour)} onChange={(e) => setNfoDay((c) => ({ ...c, publishHour: Number(e.target.value) }))} />
        </FormItem>
        <FormItem top="Минута">
          <Input type="number" min={0} max={59} value={String(nfoDay.publishMinute)} onChange={(e) => setNfoDay((c) => ({ ...c, publishMinute: Number(e.target.value) }))} />
        </FormItem>
        <FormItem top="Баллы">
          <Input type="number" value={String(nfoDay.points)} onChange={(e) => setNfoDay((c) => ({ ...c, points: Number(e.target.value) }))} />
        </FormItem>
        <Div>
          <Button size="m" onClick={() => void saveNfoDaySettings(nfoDay)}>Сохранить НФО день</Button>
        </Div>
      </Group>

      <Group header="Фокус дня (текст на главной)">
        <FormItem top="Заголовок">
          <Input value={dailyFocusTitle} onChange={(e) => setDailyFocusTitle(e.target.value)} placeholder="Если пусто — берётся задание с флагом «Фокус дня»" />
        </FormItem>
        <Div>
          <Button size="m" onClick={() => void saveDailyFocusSettings(dailyFocusTitle)}>Сохранить фокус</Button>
        </Div>
      </Group>

      <Group header="Выгрузки CSV / Excel">
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['reflection', 'tasks', 'exchange', 'rating', 'checkins', 'nfo-day', 'points-history', 'activity'] as const).map((type) => (
            <div key={type} style={{ display: 'flex', gap: 8 }}>
              <Button size="s" mode="secondary" href={getAdminExportUrl(type)} target="_blank" style={{ flex: 1 }}>
                {type} CSV
              </Button>
              <Button size="s" mode="outline" href={getAdminExportXlsxUrl(type)} target="_blank" style={{ flex: 1 }}>
                {type} XLSX
              </Button>
            </div>
          ))}
        </Div>
      </Group>
    </>
  );
}
