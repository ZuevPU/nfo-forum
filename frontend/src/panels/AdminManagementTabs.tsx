import { Div, FormItem, Input, NativeSelect, Checkbox, Textarea } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { downloadAnalyticsReport } from '../api/analytics';
import {
  adjustUserPoints,
  fetchAdminUsers,
  fetchAllTaskSubmissions,
  fetchFeedbackMessages,
  replyToFeedbackMessage,
  moderateSubmission,
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
  downloadAdminExport,
  saveReflectionLevelSettings,
  type AdminUser,
  type FeedbackMessage,
  type ReflectionAnswerRow,
  type NfoDayStats,
  type ActivityLogRow,
  type TaskSubmissionRow,
  fetchNetworkingLunchConfig,
  saveNetworkingLunchConfig,
  fetchNetworkingLunchApplications,
  fetchNetworkingLunchAssignments,
  randomizeNetworkingLunch,
  saveNetworkingLunchAssignments,
  removeNetworkingLunchAssignment,
  publishNetworkingLunch,
  sendNetworkingLunchInvitation,
  type NetworkingLunchConfig,
  type NetworkingLunchApplication,
  type NetworkingLunchTable,
} from '../api/admin';
import { ADMIN_EXPORT_LABELS, ADMIN_EXPORT_TYPES } from '../constants/exportMeta';
import { AdminListCard } from '../components/AdminListCard';
import { resolvePhotoUrl } from '../lib/mediaUrls';
import { PointsSystemSettings } from '../components/PointsSystemSettings';
import { inputTimeToMskParts, mskTimeToInput } from '../lib/datetimeMsk';
import { TRACKS } from '../constants/tracks';
import { DEFAULT_NFO_DAY_QUESTIONS } from '../constants/nfoFactors';
import { DEFAULT_REFLECTION_THRESHOLDS } from '../constants/reflectionLevels';

function intervalsToText(intervals?: { start: string; end: string; label?: string }[]): string {
  return (intervals ?? [])
    .map((i) => `${i.start}-${i.end}${i.label ? `|${i.label}` : ''}`)
    .join('\n');
}

function parseIntervalsText(text: string) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const [range, label] = trimmed.split('|').map((s) => s.trim());
      const [start, end] = range.split('-').map((s) => s.trim());
      if (!start || !end) return null;
      return { start, end, ...(label ? { label } : {}) };
    })
    .filter((i): i is { start: string; end: string; label?: string } => i != null);
}

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
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyLoading, setReplyLoading] = useState<number | null>(null);

  const load = () => {
    fetchFeedbackMessages().then((r) => setMessages(r.messages)).catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const handleReply = async (messageId: number) => {
    const text = replyDrafts[messageId]?.trim();
    if (!text) return;
    setReplyLoading(messageId);
    try {
      await replyToFeedbackMessage(messageId, text);
      setReplyDrafts((prev) => ({ ...prev, [messageId]: '' }));
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось отправить ответ');
    } finally {
      setReplyLoading(null);
    }
  };

  return (
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Обращения к организаторам</div>
      <div
        style={{ marginBottom: 12, fontSize: 12, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.45 }}
      >
        Участники пишут через «Связь с организаторами». Ответ уходит в ленту участника и push-уведомлением от сообщества.
      </div>
      <div className="nfo-admin-export-row" style={{ marginBottom: 12 }}>
        <button type="button" className="nfo-admin-btn-secondary" onClick={() => void downloadAdminExport('feedback', 'csv').catch((e) => alert(e instanceof Error ? e.message : 'Ошибка'))}>
          CSV
        </button>
        <button type="button" className="nfo-admin-btn-outline" onClick={() => void downloadAdminExport('feedback', 'xlsx').catch((e) => alert(e instanceof Error ? e.message : 'Ошибка'))}>
          XLSX
        </button>
      </div>
      {!messages.length && <div className="nfo-admin-empty">Пока нет обращений</div>}
      {messages.map((m) => (
        <AdminListCard
          key={m.id}
          title={`${m.firstName} ${m.lastName ?? ''}`.trim()}
          meta={`${m.track ?? '—'} · ${new Date(m.createdAt).toLocaleString('ru-RU')}`}
        >
          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.text}</div>
          {m.replies.map((r) => (
            <div
              key={r.id}
              style={{
                marginTop: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: '#eefbf3',
                borderLeft: '3px solid #27ae60',
              }}
            >
              <div style={{ fontSize: 11, color: '#27ae60', marginBottom: 4 }}>
                {`${r.adminFirstName} ${r.adminLastName ?? ''}`.trim()} · {new Date(r.createdAt).toLocaleString('ru-RU')}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{r.text}</div>
            </div>
          ))}
          <FormItem top="Ответ участнику" style={{ marginTop: 10, marginBottom: 0 }}>
            <Textarea
              rows={3}
              value={replyDrafts[m.id] ?? ''}
              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
              placeholder="Текст ответа от организаторов…"
            />
          </FormItem>
          <button
            type="button"
            className="nfo-admin-btn-primary"
            style={{ marginTop: 8 }}
            disabled={replyLoading === m.id || !(replyDrafts[m.id] ?? '').trim()}
            onClick={() => void handleReply(m.id)}
          >
            {replyLoading === m.id ? 'Отправка…' : 'Отправить ответ'}
          </button>
        </AdminListCard>
      ))}
    </div>
  );
}

type SubmissionFilter = 'pending' | 'approved' | 'rejected' | 'all';

function submissionStatusLabel(status: string) {
  if (status === 'approved') return 'Принято';
  if (status === 'rejected') return 'Отклонено';
  if (status === 'pending') return 'На проверке';
  return status;
}

export function AdminTaskSubmissionsTab({ initialTaskId }: { initialTaskId?: number | null }) {
  const [filter, setFilter] = useState<SubmissionFilter>('pending');
  const [taskId, setTaskId] = useState(initialTaskId != null ? String(initialTaskId) : '');
  const [submissions, setSubmissions] = useState<TaskSubmissionRow[]>([]);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAllTaskSubmissions({
      status: filter === 'all' ? undefined : filter,
      taskId: taskId.trim() ? Number(taskId) : undefined,
      limit: 200,
    })
      .then((r) => setSubmissions(r.submissions))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter, taskId]);

  return (
    <div className="nfo-admin-section">
      <div className="nfo-sec-title">Ответы на задания</div>
      <div className="nfo-admin-form-card" style={{ marginBottom: 12 }}>
        <FormItem top="Статус">
          <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as SubmissionFilter)}>
            <option value="pending">На модерации</option>
            <option value="approved">Принятые</option>
            <option value="rejected">Отклонённые</option>
            <option value="all">Все</option>
          </NativeSelect>
        </FormItem>
        <FormItem top="ID задания (необязательно)">
          <Input value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="Например: 3" />
        </FormItem>
      </div>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>Загрузка…</Div>
      ) : submissions.length === 0 ? (
        <div className="nfo-admin-empty">Нет ответов по выбранным фильтрам</div>
      ) : (
        submissions.map((s) => (
          <AdminListCard
            key={s.id}
            title={s.taskTitle ?? `Задание #${s.taskId}`}
            meta={[
              `${s.userName} ${s.userLastName ?? ''}`.trim(),
              s.userTrack ?? '—',
              submissionStatusLabel(s.status),
              new Date(s.createdAt).toLocaleString('ru-RU'),
            ].filter(Boolean).join(' · ')}
          >
            {s.answerText ? (
              <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{s.answerText}</div>
            ) : (
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--vkui--color_text_secondary)' }}>Текст не указан</div>
            )}
            {s.photos && s.photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {s.photos.map((stored, i) => {
                  const url = resolvePhotoUrl(stored);
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" title="Открыть фото">
                      <img src={url} alt={`Фото ${i + 1}`} style={{ width: 96, height: 96, borderRadius: 8, objectFit: 'cover' }} />
                    </a>
                  );
                })}
              </div>
            )}
            {s.status === 'pending' && (
              <>
                <FormItem top="Комментарий при отклонении">
                  <Input
                    value={comments[s.id] ?? ''}
                    onChange={(e) => setComments((c) => ({ ...c, [s.id]: e.target.value }))}
                    placeholder="Необязательно"
                  />
                </FormItem>
                <div className="nfo-admin-actions">
                  <button type="button" className="nfo-admin-btn-primary stretched" onClick={() => void moderateSubmission(s.id, 'approved').then(load)}>
                    Принять
                  </button>
                  <button type="button" className="nfo-admin-btn-secondary stretched" onClick={() => void moderateSubmission(s.id, 'rejected', comments[s.id]).then(load)}>
                    Отклонить
                  </button>
                </div>
              </>
            )}
            {s.adminComment && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
                Комментарий модератора: {s.adminComment}
              </div>
            )}
          </AdminListCard>
        ))
      )}
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
        <button type="button" className="nfo-admin-btn-secondary" onClick={() => void downloadAdminExport('reflection', 'csv').catch((e) => alert(e instanceof Error ? e.message : 'Ошибка'))}>
          CSV
        </button>
        <button type="button" className="nfo-admin-btn-outline" onClick={() => void downloadAdminExport('reflection', 'xlsx').catch((e) => alert(e instanceof Error ? e.message : 'Ошибка'))}>
          XLSX
        </button>
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
        <button type="button" className="nfo-admin-btn-secondary" onClick={() => void downloadAdminExport('activity', 'csv').catch((e) => alert(e instanceof Error ? e.message : 'Ошибка'))}>
          Скачать CSV
        </button>
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
  const [reflectionThresholds, setReflectionThresholds] = useState<number[]>(DEFAULT_REFLECTION_THRESHOLDS);
  const [checkin, setCheckin] = useState({
    enabledTracks: [] as string[],
    slots: [] as string[],
    byDaySlots: {
      '1': '08:30, 19:30',
      '2': '08:30, 13:15, 19:30',
      '3': '08:30, 13:15, 19:30',
      '4': '08:30, 13:15, 19:30',
    } as Record<'1' | '2' | '3' | '4', string>,
    byDayIntervals: {
      '1': '',
      '2': '',
      '3': '',
      '4': '',
    } as Record<'1' | '2' | '3' | '4', string>,
    title: 'Как ты сейчас?',
    subtitle: '30 секунд',
    emotionsText: '',
    energyLabel: 'Энергия (0-10)',
    energyLowLabel: 'еле держусь',
    energyMidLabel: 'нормально',
    energyHighLabel: 'заряжен',
    emotionLabel: 'Настроение',
    commentPlaceholder: 'Моё состояние вызвано тем, что...',
  });
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [mainExportLoading, setMainExportLoading] = useState(false);
  const [exchangeSlots, setExchangeSlots] = useState<string[]>([]);
  const [nfoDay, setNfoDay] = useState({
    publishHour: 19,
    publishMinute: 30,
    closeHour: null as number | null,
    closeMinute: null as number | null,
    points: 10,
    panelTitle: '',
    panelSubtitle: '',
    factorsText: '',
    questions: DEFAULT_NFO_DAY_QUESTIONS.map((q) => ({ ...q })),
  });
  const [dailyFocusTitle, setDailyFocusTitle] = useState('');
  const [nfoSaveMessage, setNfoSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchReflectionLevelSettings().then((r) => setReflectionThresholds(r.thresholds)).catch(console.error);
    fetchCheckinSettings().then((r) => {
      const globalIntervalsText = intervalsToText(r.intervals);
      setCheckin({
      enabledTracks: r.enabledTracks ?? [],
      slots: r.slots ?? [],
      byDaySlots: {
        '1': (r.byDay?.['1']?.slots ?? ['08:30', '19:30']).join(', '),
        '2': (r.byDay?.['2']?.slots ?? r.slots ?? ['08:30', '13:15', '19:30']).join(', '),
        '3': (r.byDay?.['3']?.slots ?? r.slots ?? ['08:30', '13:15', '19:30']).join(', '),
        '4': (r.byDay?.['4']?.slots ?? r.slots ?? ['08:30', '13:15', '19:30']).join(', '),
      },
      byDayIntervals: {
        '1': intervalsToText(r.byDay?.['1']?.intervals) || globalIntervalsText,
        '2': intervalsToText(r.byDay?.['2']?.intervals) || globalIntervalsText,
        '3': intervalsToText(r.byDay?.['3']?.intervals) || globalIntervalsText,
        '4': intervalsToText(r.byDay?.['4']?.intervals) || globalIntervalsText,
      },
      title: r.title ?? 'Как ты сейчас?',
      subtitle: r.subtitle ?? '30 секунд',
      emotionsText: (r.emotions ?? []).join('\n'),
      energyLabel: r.energyLabel ?? 'Энергия (0-10)',
      energyLowLabel: r.energyLowLabel ?? 'еле держусь',
      energyMidLabel: r.energyMidLabel ?? 'нормально',
      energyHighLabel: r.energyHighLabel ?? 'заряжен',
      emotionLabel: r.emotionLabel ?? 'Настроение',
      commentPlaceholder: r.commentPlaceholder ?? 'Моё состояние вызвано тем, что...',
    });
    }).catch(console.error);
    fetchExchangeSlots().then((r) => setExchangeSlots(r.slots)).catch(console.error);
    fetchNfoDaySettings().then((r) => setNfoDay({
      publishHour: r.publishHour,
      publishMinute: r.publishMinute,
      closeHour: r.closeHour ?? null,
      closeMinute: r.closeMinute ?? null,
      points: r.points,
      panelTitle: r.panelTitle ?? '',
      panelSubtitle: r.panelSubtitle ?? '',
      factorsText: (r.factors ?? []).join('\n'),
      questions: r.questions?.length
        ? r.questions.map((q) => ({ ...q }))
        : DEFAULT_NFO_DAY_QUESTIONS.map((q) => ({ ...q })),
    })).catch(console.error);
    fetchDailyFocusSettings().then((r) => setDailyFocusTitle(r.title)).catch(console.error);
  }, []);

  return (
    <div className="nfo-admin-section">
      <PointsSystemSettings
        reflectionThresholds={reflectionThresholds}
        onReflectionThresholdsChange={setReflectionThresholds}
        onSaveReflectionThresholds={() => void saveReflectionLevelSettings(reflectionThresholds)}
      />

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
        <FormItem top="Слоты (HH:MM через запятую, если интервалы ниже пустые)">
          <Input
            value={checkin.slots.join(', ')}
            onChange={(e) => setCheckin((c) => ({ ...c, slots: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
          />
        </FormItem>
        {(['1', '2', '3', '4'] as const).map((day) => (
          <div key={day}>
            <FormItem top={`День ${day} — слоты (HH:MM через запятую)`}>
              <Input
                value={checkin.byDaySlots[day]}
                onChange={(e) => setCheckin((c) => ({
                  ...c,
                  byDaySlots: { ...c.byDaySlots, [day]: e.target.value },
                }))}
              />
            </FormItem>
            <FormItem top={`День ${day} — интервалы (строка: HH:MM-HH:MM|подпись)`}>
              <Textarea
                rows={2}
                value={checkin.byDayIntervals[day]}
                onChange={(e) => setCheckin((c) => ({
                  ...c,
                  byDayIntervals: { ...c.byDayIntervals, [day]: e.target.value },
                }))}
                placeholder={'08:30-13:15|Утренний чек-in\n19:30-24:00|Вечерний чек-in'}
              />
            </FormItem>
          </div>
        ))}
        <FormItem top="Заголовок экрана чек-ина">
          <Input value={checkin.title} onChange={(e) => setCheckin((c) => ({ ...c, title: e.target.value }))} />
        </FormItem>
        <FormItem top="Подзаголовок">
          <Input value={checkin.subtitle} onChange={(e) => setCheckin((c) => ({ ...c, subtitle: e.target.value }))} />
        </FormItem>
        <FormItem top="Подпись шкалы энергии">
          <Input value={checkin.energyLabel} onChange={(e) => setCheckin((c) => ({ ...c, energyLabel: e.target.value }))} />
        </FormItem>
        <FormItem top="Подпись уровня 0">
          <Input value={checkin.energyLowLabel} onChange={(e) => setCheckin((c) => ({ ...c, energyLowLabel: e.target.value }))} />
        </FormItem>
        <FormItem top="Подпись уровня 5">
          <Input value={checkin.energyMidLabel} onChange={(e) => setCheckin((c) => ({ ...c, energyMidLabel: e.target.value }))} />
        </FormItem>
        <FormItem top="Подпись уровня 10">
          <Input value={checkin.energyHighLabel} onChange={(e) => setCheckin((c) => ({ ...c, energyHighLabel: e.target.value }))} />
        </FormItem>
        <FormItem top="Подпись блока настроения">
          <Input value={checkin.emotionLabel} onChange={(e) => setCheckin((c) => ({ ...c, emotionLabel: e.target.value }))} />
        </FormItem>
        <FormItem top="Эмоции (по одной на строку)">
          <Textarea rows={4} value={checkin.emotionsText} onChange={(e) => setCheckin((c) => ({ ...c, emotionsText: e.target.value }))} />
        </FormItem>
        <FormItem top="Плейсхолдер комментария">
          <Input value={checkin.commentPlaceholder} onChange={(e) => setCheckin((c) => ({ ...c, commentPlaceholder: e.target.value }))} />
        </FormItem>
        <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.45, marginBottom: 12 }}>
          Интервалы имеют приоритет над слотами. После ответа форма закрыта до следующего интервала.
          Тип «Состояние (чек-ин)» во вкладке «Вопросы» — это /questions, не /checkin.
        </div>
        <button
          type="button"
          className="nfo-admin-btn-primary"
          onClick={() => void saveCheckinSettings({
            enabledTracks: checkin.enabledTracks,
            slots: checkin.slots,
            byDay: {
              '1': {
                slots: checkin.byDaySlots['1'].split(',').map((s) => s.trim()).filter(Boolean),
                intervals: parseIntervalsText(checkin.byDayIntervals['1']),
              },
              '2': {
                slots: checkin.byDaySlots['2'].split(',').map((s) => s.trim()).filter(Boolean),
                intervals: parseIntervalsText(checkin.byDayIntervals['2']),
              },
              '3': {
                slots: checkin.byDaySlots['3'].split(',').map((s) => s.trim()).filter(Boolean),
                intervals: parseIntervalsText(checkin.byDayIntervals['3']),
              },
              '4': {
                slots: checkin.byDaySlots['4'].split(',').map((s) => s.trim()).filter(Boolean),
                intervals: parseIntervalsText(checkin.byDayIntervals['4']),
              },
            },
            title: checkin.title,
            subtitle: checkin.subtitle,
            emotions: checkin.emotionsText.split('\n').map((s) => s.trim()).filter(Boolean),
            energyLabel: checkin.energyLabel,
            energyLowLabel: checkin.energyLowLabel,
            energyMidLabel: checkin.energyMidLabel,
            energyHighLabel: checkin.energyHighLabel,
            emotionLabel: checkin.emotionLabel,
            commentPlaceholder: checkin.commentPlaceholder,
          })}
        >
          Сохранить чек-ин
        </button>
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Слоты «Обмена опытом»</div>
      <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginBottom: 8, lineHeight: 1.45 }}>
        Рассылка «Время обмена опытом!…» — только в указанные слоты (±5 мин, МСК). Отдельно участникам может прийти «Тебе назначен вопрос…» — когда одобрили чужой вопрос и система выбрала ответчиков; это не слот и время случайное.
      </div>
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

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Вечерняя рефлексия НФО</div>
      <div className="nfo-admin-form-card">
        <FormItem top="Заголовок экрана">
          <Input value={nfoDay.panelTitle} onChange={(e) => setNfoDay((c) => ({ ...c, panelTitle: e.target.value }))} placeholder="Каким было НФО сегодня?" />
        </FormItem>
        <FormItem top="Подзаголовок">
          <Input value={nfoDay.panelSubtitle} onChange={(e) => setNfoDay((c) => ({ ...c, panelSubtitle: e.target.value }))} placeholder="Вечерняя рефлексия" />
        </FormItem>
        {nfoDay.questions.map((q, index) => (
          <FormItem key={q.id} top={`Вопрос ${index + 1}${q.type === 'multiselect' ? ' (множественный выбор, до 3)' : q.required === false ? ' (необязательный)' : ''}`}>
            <Textarea
              rows={2}
              value={q.label}
              onChange={(e) => setNfoDay((c) => ({
                ...c,
                questions: c.questions.map((item) => (item.id === q.id ? { ...item, label: e.target.value } : item)),
              }))}
            />
          </FormItem>
        ))}
        <FormItem top="Плашки факторов (по одной на строку, пусто = список по умолчанию)">
          <Textarea rows={4} value={nfoDay.factorsText} onChange={(e) => setNfoDay((c) => ({ ...c, factorsText: e.target.value }))} />
        </FormItem>
        <FormItem top="Время публикации (МСК)">
          <Input
            type="time"
            value={mskTimeToInput(nfoDay.publishHour, nfoDay.publishMinute)}
            onChange={(e) => {
              const { hour, minute } = inputTimeToMskParts(e.target.value);
              setNfoDay((c) => ({ ...c, publishHour: hour, publishMinute: minute }));
            }}
          />
        </FormItem>
        <FormItem top="Время закрытия (МСК, необязательно)">
          <Input
            type="time"
            value={nfoDay.closeHour != null && nfoDay.closeMinute != null ? mskTimeToInput(nfoDay.closeHour, nfoDay.closeMinute) : ''}
            onChange={(e) => {
              if (!e.target.value) {
                setNfoDay((c) => ({ ...c, closeHour: null, closeMinute: null }));
                return;
              }
              const { hour, minute } = inputTimeToMskParts(e.target.value);
              setNfoDay((c) => ({ ...c, closeHour: hour, closeMinute: minute }));
            }}
          />
        </FormItem>
        <FormItem top="Баллы">
          <Input type="number" value={String(nfoDay.points)} onChange={(e) => setNfoDay((c) => ({ ...c, points: Number(e.target.value) }))} />
        </FormItem>
        <button
          type="button"
          className="nfo-admin-btn-primary"
          onClick={() => void saveNfoDaySettings({
            publishHour: nfoDay.publishHour,
            publishMinute: nfoDay.publishMinute,
            closeHour: nfoDay.closeHour,
            closeMinute: nfoDay.closeMinute,
            points: nfoDay.points,
            panelTitle: nfoDay.panelTitle.trim(),
            panelSubtitle: nfoDay.panelSubtitle.trim(),
            factors: nfoDay.factorsText.split('\n').map((s) => s.trim()).filter(Boolean),
            questions: nfoDay.questions.map((q) => ({
              id: q.id,
              label: q.label.trim(),
              type: q.type,
              required: q.required,
              maxSelect: q.maxSelect,
            })),
          }).then((r) => {
            const saved = r.settings;
            setNfoDay({
              publishHour: saved.publishHour,
              publishMinute: saved.publishMinute,
              closeHour: saved.closeHour ?? null,
              closeMinute: saved.closeMinute ?? null,
              points: saved.points,
              panelTitle: saved.panelTitle ?? '',
              panelSubtitle: saved.panelSubtitle ?? '',
              factorsText: (saved.factors ?? []).join('\n'),
              questions: saved.questions?.length
                ? saved.questions.map((q) => ({ ...q }))
                : nfoDay.questions,
            });
            setNfoSaveMessage('Сохранено');
            window.setTimeout(() => setNfoSaveMessage(null), 2500);
          }).catch((e) => alert(e instanceof Error ? e.message : 'Ошибка сохранения'))}
        >
          Сохранить вечернюю рефлексию
        </button>
        {nfoSaveMessage && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--nfo-green)', textAlign: 'center' }}>
            {nfoSaveMessage}
          </div>
        )}
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
        <button
          type="button"
          className="nfo-admin-btn-primary"
          disabled={mainExportLoading || exportLoading != null}
          style={{ marginBottom: 12, width: '100%' }}
          onClick={() => {
            setMainExportLoading(true);
            void downloadAnalyticsReport()
              .catch((e) => alert(e instanceof Error ? e.message : 'Ошибка выгрузки'))
              .finally(() => setMainExportLoading(false));
          }}
        >
          {mainExportLoading ? 'Формирование…' : 'Скачать главную выгрузку (Excel)'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ADMIN_EXPORT_TYPES.map((type) => (
            <div key={type} className="nfo-admin-export-row">
              <span style={{ minWidth: 180, fontSize: 13, fontWeight: 600 }}>{ADMIN_EXPORT_LABELS[type]}</span>
              <button
                type="button"
                className="nfo-admin-btn-secondary"
                disabled={exportLoading != null || mainExportLoading}
                onClick={() => {
                  const key = `${type}-csv`;
                  setExportLoading(key);
                  void downloadAdminExport(type, 'csv')
                    .catch((e) => alert(e instanceof Error ? e.message : 'Ошибка выгрузки'))
                    .finally(() => setExportLoading(null));
                }}
              >
                {exportLoading === `${type}-csv` ? '…' : 'CSV'}
              </button>
              <button
                type="button"
                className="nfo-admin-btn-outline"
                disabled={exportLoading != null || mainExportLoading}
                onClick={() => {
                  const key = `${type}-xlsx`;
                  setExportLoading(key);
                  void downloadAdminExport(type, 'xlsx')
                    .catch((e) => alert(e instanceof Error ? e.message : 'Ошибка выгрузки'))
                    .finally(() => setExportLoading(null));
                }}
              >
                {exportLoading === `${type}-xlsx` ? '…' : 'Excel'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminNetworkingLunchTab() {
  const [config, setConfig] = useState<NetworkingLunchConfig | null>(null);
  const [applications, setApplications] = useState<NetworkingLunchApplication[]>([]);
  const [tables, setTables] = useState<NetworkingLunchTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialError, setPartialError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [publishTimeText, setPublishTimeText] = useState('12:00');

  const reload = async () => {
    setLoadError(null);
    setPartialError(null);

    try {
      const cfg = await fetchNetworkingLunchConfig();
      setConfig(cfg.config);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось загрузить настройки';
      setLoadError(msg);
    }

    const [appsResult, assignResult] = await Promise.allSettled([
      fetchNetworkingLunchApplications(),
      fetchNetworkingLunchAssignments(),
    ]);

    const partialErrors: string[] = [];
    if (appsResult.status === 'fulfilled') {
      setApplications(appsResult.value.applications);
    } else {
      partialErrors.push(`заявки: ${appsResult.reason instanceof Error ? appsResult.reason.message : 'ошибка'}`);
    }
    if (assignResult.status === 'fulfilled') {
      setTables(assignResult.value.tables);
    } else {
      partialErrors.push(`столы: ${assignResult.reason instanceof Error ? assignResult.reason.message : 'ошибка'}`);
    }

    if (partialErrors.length > 0) {
      const hint = partialErrors.some((e) => /failed|500|internal/i.test(e))
        ? ' Возможно, не применены миграции БД (apply-pending-migrations.mjs).'
        : '';
      setPartialError(`${partialErrors.join('; ')}.${hint}`);
    }
  };

  useEffect(() => {
    reload()
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
        setLoadError(msg);
        console.error(e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!config) return;
    setPublishTimeText(mskTimeToInput(config.publishHour, config.publishMinute));
  }, [config?.publishHour, config?.publishMinute, config]);

  const commitPublishTime = () => {
    if (!config) return;
    const v = publishTimeText.trim();
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) {
      setPublishTimeText(mskTimeToInput(config.publishHour, config.publishMinute));
      return;
    }
    const { hour, minute } = inputTimeToMskParts(v);
    setPublishTimeText(mskTimeToInput(hour, minute));
    setConfig({ ...config, publishHour: hour, publishMinute: minute });
  };

  if (loading) {
    return <Div style={{ padding: 24, textAlign: 'center' }}>Загрузка...</Div>;
  }

  if (loadError && !config) {
    return (
      <Div style={{ padding: 24, textAlign: 'center', color: '#e74c3c', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Не удалось открыть «Нетворкинг-обед»</div>
        <div style={{ fontSize: 13 }}>{loadError}</div>
        <button type="button" className="nfo-admin-btn-secondary" style={{ marginTop: 12 }} onClick={() => { setLoading(true); void reload().finally(() => setLoading(false)); }}>
          Повторить
        </button>
      </Div>
    );
  }

  if (!config) {
    return <Div style={{ padding: 24, textAlign: 'center', color: '#e74c3c' }}>Настройки не загружены</Div>;
  }

  const saveConfig = async () => {
    if (!config) return;
    if (!config.taskTitle.trim()) {
      alert('Укажите заголовок задания');
      return;
    }
    if (!config.taskDescription.trim()) {
      alert('Укажите описание задания');
      return;
    }
    if (!config.invitationText.trim()) {
      alert('Укажите текст приглашения (push)');
      return;
    }
    setSaving(true);
    setMessage(null);

    let payload = config;
    const v = publishTimeText.trim();
    if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) {
      const { hour, minute } = inputTimeToMskParts(v);
      payload = { ...config, publishHour: hour, publishMinute: minute };
      setConfig(payload);
      setPublishTimeText(mskTimeToInput(hour, minute));
    } else {
      setPublishTimeText(mskTimeToInput(config.publishHour, config.publishMinute));
    }

    try {
      const res = await saveNetworkingLunchConfig(payload);
      setConfig(res.config);
      setMessage('Настройки сохранены');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setActionLoading(key);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="nfo-admin-section">
      {partialError && (
        <div className="nfo-admin-form-card" style={{ marginBottom: 12, fontSize: 13, color: '#e74c3c', lineHeight: 1.45 }}>
          Часть данных не загрузилась: {partialError}
        </div>
      )}
      <div className="nfo-sec-title">Настройки нетворкинг-обеда</div>
      <div className="nfo-admin-form-card">
        <FormItem top="Заголовок задания">
          <Input
            value={config.taskTitle}
            onChange={(e) => setConfig({ ...config, taskTitle: e.target.value })}
            placeholder="Нетворкинг-обед"
          />
        </FormItem>
        <FormItem top="Описание задания для участников">
          <Textarea
            rows={4}
            value={config.taskDescription}
            onChange={(e) => setConfig({ ...config, taskDescription: e.target.value })}
            placeholder="Сегодня на обеде можно поучаствовать в нетворкинг-обеде…"
          />
        </FormItem>

        <FormItem top="Время публикации (МСК, 24 ч)">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="19:30"
            maxLength={5}
            value={publishTimeText}
            onChange={(e) => setPublishTimeText(e.target.value.replace(/[^\d:]/g, '').slice(0, 5))}
            onBlur={() => commitPublishTime()}
          />
        </FormItem>

        <FormItem top="Текст приглашения (push)">
          <Textarea
            rows={3}
            value={config.invitationText}
            onChange={(e) => setConfig({ ...config, invitationText: e.target.value })}
            placeholder="Открыта регистрация на нетворкинг-обед! Нажми «Принять участие» в задании."
          />
        </FormItem>

        <FormItem top="Число столов">
          <Input
            type="number"
            min={1}
            value={String(config.tableCount)}
            onChange={(e) => setConfig({ ...config, tableCount: Number(e.target.value) })}
          />
        </FormItem>
        <FormItem top="Мест за столом">
          <Input
            type="number"
            min={1}
            value={String(config.seatsPerTable)}
            onChange={(e) => setConfig({ ...config, seatsPerTable: Number(e.target.value) })}
          />
        </FormItem>

        {config.invitationSentAt && (
          <div style={{ fontSize: 12, color: '#27ae60', marginBottom: 8 }}>
            Приглашение отправлено: {new Date(config.invitationSentAt).toLocaleString('ru-RU')}
          </div>
        )}
        {config.assignmentsSentAt && (
          <div style={{ fontSize: 12, color: '#27ae60', marginBottom: 8 }}>
            Распределение отправлено: {new Date(config.assignmentsSentAt).toLocaleString('ru-RU')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="nfo-admin-btn-primary" disabled={saving} onClick={() => void saveConfig()}>
            {saving ? 'Сохранение…' : 'Сохранить настройки'}
          </button>
          <button
            type="button"
            className="nfo-admin-btn-secondary"
            disabled={actionLoading != null}
            onClick={() =>
              void runAction('invite', async () => {
                if (!window.confirm('Отправить push-приглашение на нетворкинг-обед всем участникам?')) return;
                const res = await sendNetworkingLunchInvitation();
                const cfg = await fetchNetworkingLunchConfig();
                setConfig(cfg.config);
                setMessage(`Приглашение отправлено: ${res.sent} получателей`);
              })
            }
          >
            {actionLoading === 'invite' ? '…' : 'Отправить приглашение на нетворкинг-обед'}
          </button>
        </div>
        {message && <div style={{ marginTop: 8, fontSize: 12, color: '#27ae60' }}>{message}</div>}
      </div>

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>
        Заявки ({applications.length})
      </div>
      {applications.length === 0 && <div className="nfo-admin-empty">Пока нет заявок</div>}
      {applications.slice(0, 100).map((a) => (
        <AdminListCard
          key={a.userId}
          title={`${a.firstName} ${a.lastName ?? ''}`.trim()}
          meta={`${a.track ?? '—'} · ${new Date(a.createdAt).toLocaleString('ru-RU')}`}
        />
      ))}

      <div className="nfo-sec-title" style={{ marginTop: 12 }}>Распределение по столам</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          type="button"
          className="nfo-admin-btn-secondary"
          disabled={actionLoading != null || !!config.assignmentsSentAt}
          onClick={() =>
            void runAction('randomize', async () => {
              const res = await randomizeNetworkingLunch();
              setTables(res.tables);
              setMessage('Участники распределены случайно (закреплённые не тронуты)');
            })
          }
        >
          {actionLoading === 'randomize' ? '…' : 'Распределить случайно'}
        </button>
        <button
          type="button"
          className="nfo-admin-btn-primary"
          disabled={actionLoading != null || !!config.assignmentsSentAt}
          onClick={() =>
            void runAction('publish', async () => {
              if (!window.confirm('Отправить push всем участникам с номерами столов?')) return;
              const res = await publishNetworkingLunch();
              const cfg = await fetchNetworkingLunchConfig();
              setConfig(cfg.config);
              setMessage(`Push отправлен: ${res.sent} получателей`);
            })
          }
        >
          {actionLoading === 'publish' ? '…' : 'Отправить распределение участникам'}
        </button>
      </div>

      {tables.length === 0 && <div className="nfo-admin-empty">Столы пусты — нажми «Распределить случайно»</div>}
      {tables.map((table) => (
        <div key={table.tableNumber} className="nfo-admin-form-card" style={{ marginBottom: 8 }}>
          <div className="nfo-sec-title">Стол № {table.tableNumber}</div>
          {table.seats.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>Пусто</div>
          )}
          {table.seats.map((seat) => (
            <AdminListCard
              key={seat.userId}
              title={`${seat.firstName} ${seat.lastName ?? ''}`.trim()}
              meta={`${seat.track ?? '—'}${seat.isPinned ? ' · закреплён' : ''}`}
              actions={
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <NativeSelect
                    value={String(seat.tableNumber)}
                    disabled={!!config.assignmentsSentAt}
                    onChange={(e) => {
                      const tableNumber = Number(e.target.value);
                      void saveNetworkingLunchAssignments([
                        { userId: seat.userId, tableNumber, isPinned: seat.isPinned },
                      ])
                        .then((res) => setTables(res.tables))
                        .catch((err) => alert(err instanceof Error ? err.message : 'Ошибка'));
                    }}
                  >
                    {[...Array(config.tableCount)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Стол {i + 1}
                      </option>
                    ))}
                  </NativeSelect>
                  <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Checkbox
                      checked={seat.isPinned}
                      disabled={!!config.assignmentsSentAt}
                      onChange={(e) => {
                        void saveNetworkingLunchAssignments([
                          { userId: seat.userId, tableNumber: seat.tableNumber, isPinned: e.target.checked },
                        ])
                          .then((res) => setTables(res.tables))
                          .catch((err) => alert(err instanceof Error ? err.message : 'Ошибка'));
                      }}
                    />
                    Закрепить
                  </label>
                  {!config.assignmentsSentAt && (
                    <button
                      type="button"
                      className="nfo-admin-btn-outline"
                      onClick={() => {
                        void removeNetworkingLunchAssignment(seat.userId)
                          .then((res) => setTables(res.tables))
                          .catch((err) => alert(err instanceof Error ? err.message : 'Ошибка'));
                      }}
                    >
                      Убрать
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      ))}

      {applications.length > 0 && (
        <>
          <div className="nfo-sec-title" style={{ marginTop: 12 }}>Добавить из заявок</div>
          {applications
            .filter((a) => !tables.some((t) => t.seats.some((s) => s.userId === a.userId)))
            .slice(0, 20)
            .map((a) => (
              <AdminListCard
                key={`add-${a.userId}`}
                title={`${a.firstName} ${a.lastName ?? ''}`.trim()}
                meta={a.track ?? '—'}
                actions={
                  <NativeSelect
                    defaultValue=""
                    disabled={!!config.assignmentsSentAt}
                    onChange={(e) => {
                      const tableNumber = Number(e.target.value);
                      if (!tableNumber) return;
                      void saveNetworkingLunchAssignments([{ userId: a.userId, tableNumber }])
                        .then((res) => setTables(res.tables))
                        .catch((err) => alert(err instanceof Error ? err.message : 'Ошибка'));
                    }}
                  >
                    <option value="">На стол…</option>
                    {[...Array(config.tableCount)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Стол {i + 1}
                      </option>
                    ))}
                  </NativeSelect>
                }
              />
            ))}
        </>
      )}
    </div>
  );
}
