import { Div, FormItem, Input, NativeSelect, Checkbox } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  adjustUserPoints,
  fetchAdminUsers,
  fetchFeedbackMessages,
  fetchPointsSettings,
  fetchReflectionLevelSettings,
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
  saveReflectionLevelSettings,
  type AdminUser,
  type FeedbackMessage,
  type ReflectionAnswerRow,
  type NfoDayStats,
  type ActivityLogRow,
} from '../api/admin';
import { AdminListCard } from '../components/AdminListCard';
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
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Участники</div>
      <div className="nfo-admin-form-card">
        <FormItem top="Фильтр по треку">
          <NativeSelect value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)}>
            <option value="">Все</option>
            {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
          </NativeSelect>
        </FormItem>
        <FormItem top="ID участника">
          <Input value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} />
        </FormItem>
        <FormItem top="Баллы (+/-)">
          <Input type="number" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} />
        </FormItem>
        <FormItem top="Комментарий">
          <Input value={adjustComment} onChange={(e) => setAdjustComment(e.target.value)} />
        </FormItem>
        <button type="button" className="nfo-admin-btn-primary" onClick={() => void adjustUserPoints(Number(adjustUserId), Number(adjustPoints), adjustComment).then(load)}>
          Скорректировать баллы
        </button>
      </div>

      {users.length === 0 && <div className="nfo-admin-empty">Нет участников</div>}
      {users.map((u) => (
        <AdminListCard
          key={u.id}
          title={`${u.firstName} ${u.lastName ?? ''}`.trim()}
          meta={`${u.track ?? '—'} · ${u.points} б.`}
        />
      ))}
    </div>
  );
}

export function AdminFeedbackTab() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  useEffect(() => {
    fetchFeedbackMessages().then((r) => setMessages(r.messages)).catch(console.error);
  }, []);

  return (
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Сообщения от участников</div>
      {!messages.length && <div className="nfo-admin-empty">Нет сообщений</div>}
      {messages.map((m) => (
        <AdminListCard
          key={m.id}
          title={`${m.firstName} ${m.lastName ?? ''}`.trim()}
          meta={`${m.track ?? '—'} · ${new Date(m.createdAt).toLocaleString('ru-RU')}`}
        >
          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.4 }}>{m.text}</div>
        </AdminListCard>
      ))}
    </div>
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
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Ответы на рефлексию</div>
      <div className="nfo-admin-export-row" style={{ marginBottom: 12 }}>
        <a className="nfo-admin-btn-secondary" href={getAdminExportUrl('reflection')} target="_blank" rel="noreferrer">CSV</a>
        <a className="nfo-admin-btn-outline" href={getAdminExportXlsxUrl('reflection')} target="_blank" rel="noreferrer">XLSX</a>
      </div>
      <div className="nfo-admin-form-card">
        <FormItem top="Трек">
          <NativeSelect value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="">Все</option>
            {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
          </NativeSelect>
        </FormItem>
        <FormItem top="Дата (YYYY-MM-DD)">
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </FormItem>
      </div>
      {!answers.length && <div className="nfo-admin-empty">Нет ответов</div>}
      {answers.map((a) => (
        <AdminListCard
          key={a.id}
          title={`${a.userName} ${a.userLastName ?? ''}`.trim()}
          meta={`${a.track ?? '—'} · ${a.questionType} · ${new Date(a.createdAt).toLocaleString('ru-RU')}`}
        >
          <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>{a.questionText}</div>
          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.4 }}>{a.answerText}</div>
        </AdminListCard>
      ))}
    </div>
  );
}

export function AdminNfoStatsTab() {
  const [stats, setStats] = useState<NfoDayStats | null>(null);
  useEffect(() => {
    fetchNfoDayStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <Div style={{ padding: 24, textAlign: 'center' }}>Загрузка...</Div>;

  return (
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Частота факторов</div>
      {Object.entries(stats.factorCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([factor, count]) => (
          <AdminListCard key={factor} title={factor} actions={<span style={{ fontWeight: 700, color: 'var(--nfo-primary)' }}>{count}</span>} />
        ))}

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Ответы НФО дня</div>
      {stats.answers.slice(0, 50).map((a, i) => (
        <AdminListCard
          key={i}
          title={a.userName}
          meta={`${a.track ?? '—'} · ${a.date}`}
        >
          <div style={{ marginTop: 4, fontSize: 14 }}>{a.answerText}</div>
          <div style={{ fontSize: 11, marginTop: 4, color: 'var(--vkui--color_text_secondary)' }}>{a.factors.join(', ')}</div>
        </AdminListCard>
      ))}
    </div>
  );
}

export function AdminActivityTab() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  useEffect(() => {
    fetchActivityLogs().then((r) => setLogs(r.logs)).catch(console.error);
  }, []);

  return (
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Журнал активности</div>
      <div style={{ marginBottom: 12 }}>
        <a className="nfo-admin-btn-secondary" href={getAdminExportUrl('activity')} target="_blank" rel="noreferrer">
          Скачать CSV
        </a>
      </div>
      {logs.slice(0, 100).map((l) => (
        <AdminListCard
          key={l.id}
          title={`${l.userName} (${l.track ?? '—'})`}
          meta={`${new Date(l.createdAt).toLocaleString('ru-RU')} · ${l.action}`}
        />
      ))}
    </div>
  );
}

export function AdminSettingsTab() {
  const [config, setConfig] = useState<Record<string, number>>({});
  const [reflectionThresholds, setReflectionThresholds] = useState<number[]>([0, 30, 70, 120, 200]);
  const [checkin, setCheckin] = useState<{ enabledTracks: string[]; slots: string[] }>({ enabledTracks: [], slots: [] });
  const [exchangeSlots, setExchangeSlots] = useState<string[]>([]);
  const [nfoDay, setNfoDay] = useState({ publishHour: 19, publishMinute: 30, points: 10 });
  const [dailyFocusTitle, setDailyFocusTitle] = useState('');

  useEffect(() => {
    fetchPointsSettings().then((r) => setConfig(r.config)).catch(console.error);
    fetchReflectionLevelSettings().then((r) => setReflectionThresholds(r.thresholds)).catch(console.error);
    fetchCheckinSettings().then(setCheckin).catch(console.error);
    fetchExchangeSlots().then((r) => setExchangeSlots(r.slots)).catch(console.error);
    fetchNfoDaySettings().then(setNfoDay).catch(console.error);
    fetchDailyFocusSettings().then((r) => setDailyFocusTitle(r.title)).catch(console.error);
  }, []);

  return (
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Баллы за действия</div>
      <div className="nfo-admin-form-card">
        {Object.entries(config).map(([key, value]) => (
          <FormItem key={key} top={key}>
            <Input
              type="number"
              value={String(value)}
              onChange={(e) => setConfig((c) => ({ ...c, [key]: Number(e.target.value) }))}
            />
          </FormItem>
        ))}
        <button type="button" className="nfo-admin-btn-primary" onClick={() => void savePointsSettings(config)}>
          Сохранить баллы
        </button>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Пороги уровней рефлексии</div>
      <div className="nfo-admin-form-card">
        {reflectionThresholds.slice(1).map((value, index) => (
          <FormItem key={index + 2} top={`Уровень ${index + 2} — минимум баллов рефлексии`}>
            <Input
              type="number"
              value={String(value)}
              onChange={(e) => {
                const next = [...reflectionThresholds];
                next[index + 1] = Number(e.target.value);
                setReflectionThresholds(next);
              }}
            />
          </FormItem>
        ))}
        <button
          type="button"
          className="nfo-admin-btn-primary"
          onClick={() => void saveReflectionLevelSettings(reflectionThresholds)}
        >
          Сохранить пороги рефлексии
        </button>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Чек-ин по трекам</div>
      <div className="nfo-admin-form-card">
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
        <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.45, marginBottom: 12 }}>
          После ответа чек-ин недоступен до следующего слота. Вопросы фиксированы в приложении (энергия + настроение).
        </div>
        <button type="button" className="nfo-admin-btn-primary" onClick={() => void saveCheckinSettings(checkin)}>
          Сохранить чек-ин
        </button>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Слоты «Обмена опытом»</div>
      <div className="nfo-admin-form-card">
        <FormItem top="Время рассылки (HH:MM через запятую)">
          <Input
            value={exchangeSlots.join(', ')}
            onChange={(e) => setExchangeSlots(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        </FormItem>
        <button type="button" className="nfo-admin-btn-primary" onClick={() => void saveExchangeSlots(exchangeSlots)}>
          Сохранить слоты
        </button>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Вопрос дня НФО</div>
      <div className="nfo-admin-form-card">
        <FormItem top="Час публикации (MSK)">
          <Input type="number" min={0} max={23} value={String(nfoDay.publishHour)} onChange={(e) => setNfoDay((c) => ({ ...c, publishHour: Number(e.target.value) }))} />
        </FormItem>
        <FormItem top="Минута">
          <Input type="number" min={0} max={59} value={String(nfoDay.publishMinute)} onChange={(e) => setNfoDay((c) => ({ ...c, publishMinute: Number(e.target.value) }))} />
        </FormItem>
        <FormItem top="Баллы">
          <Input type="number" value={String(nfoDay.points)} onChange={(e) => setNfoDay((c) => ({ ...c, points: Number(e.target.value) }))} />
        </FormItem>
        <button type="button" className="nfo-admin-btn-primary" onClick={() => void saveNfoDaySettings(nfoDay)}>
          Сохранить НФО день
        </button>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Фокус дня (текст на главной)</div>
      <div className="nfo-admin-form-card">
        <FormItem top="Заголовок">
          <Input value={dailyFocusTitle} onChange={(e) => setDailyFocusTitle(e.target.value)} placeholder="Если пусто — берётся задание с флагом «Фокус дня»" />
        </FormItem>
        <button type="button" className="nfo-admin-btn-primary" onClick={() => void saveDailyFocusSettings(dailyFocusTitle)}>
          Сохранить фокус
        </button>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Выгрузки CSV / Excel</div>
      <div className="nfo-admin-form-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['reflection', 'tasks', 'exchange', 'rating', 'checkins', 'nfo-day', 'points-history', 'activity'] as const).map((type) => (
            <div key={type} className="nfo-admin-export-row">
              <a className="nfo-admin-btn-secondary" href={getAdminExportUrl(type)} target="_blank" rel="noreferrer">
                {type} CSV
              </a>
              <a className="nfo-admin-btn-outline" href={getAdminExportXlsxUrl(type)} target="_blank" rel="noreferrer">
                {type} XLSX
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
