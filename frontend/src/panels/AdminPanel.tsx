import {
  Button,
  Div,
  FormItem,
  Input,
  NativeSelect,
  Panel,
  Spinner,
  Textarea,
  Badge,
  Checkbox,
} from '@vkontakte/vkui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminListCard } from '../components/AdminListCard';
import { AdminTabNav } from '../components/AdminTabNav';
import { GradientHeader } from '../components/GradientHeader';
import type { AdminTab } from '../constants/adminTabs';
import {
  createAdminEvent,
  createAdminTask,
  createReflectionQuestion,
  deleteAdminEvent,
  deleteAdminTask,
  deleteReflectionQuestion,
  updateReflectionQuestion,
  fetchAdminEvents,
  fetchAdminTasks,
  fetchBroadcasts,
  fetchPendingExchange,
  fetchPendingSubmissions,
  fetchReflectionQuestions,
  moderateExchange,
  hideExchangeQuestion,
  moderateSubmission,
  sendAdminPush,
  updateAdminEvent,
  updateAdminTask,
  fetchDiagnosticsSettings,
  saveDiagnosticsSettings,
  fetchDiagnosticsResults,
  getDiagnosticsExportUrl,
  fetchExchangeActivity,
  type ExchangeActivityRow,
  type AdminEvent,
  type AdminTask,
  type Broadcast,
  type PendingQuestion,
  type PendingSubmission,
  type ReflectionQuestion,
  type DiagnosticResult,
} from '../api/admin';
import { AdminFeedbackTab, AdminSettingsTab, AdminUsersTab, AdminReflectionAnswersTab, AdminNfoStatsTab, AdminActivityTab } from './AdminManagementTabs';
import { TRACKS } from '../constants/tracks';
import { useAuthContext } from '../contexts/AuthContext';
import { pickImage } from '../lib/vk-bridge';

export function AdminPanel() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('events');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [reflections, setReflections] = useState<ReflectionQuestion[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [diagTracks, setDiagTracks] = useState<string[]>([]);
  const [diagResults, setDiagResults] = useState<DiagnosticResult[]>([]);
  const [exchangeActivity, setExchangeActivity] = useState<ExchangeActivityRow[]>([]);
  const [submissionComments, setSubmissionComments] = useState<Record<number, string>>({});

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventTrack, setNewEventTrack] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventPlace, setNewEventPlace] = useState('');
  const [newEventIsKeyBlock, setNewEventIsKeyBlock] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventStartTime, setEditEventStartTime] = useState('');
  const [editEventEndTime, setEditEventEndTime] = useState('');
  const [editEventPlace, setEditEventPlace] = useState('');
  const [editEventIsKeyBlock, setEditEventIsKeyBlock] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('20');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskAllowMultiple, setNewTaskAllowMultiple] = useState(false);
  const [newTaskRequiresPhoto, setNewTaskRequiresPhoto] = useState(false);
  const [newTaskSendNotification, setNewTaskSendNotification] = useState(true);
  const [newTaskIsFocusOfDay, setNewTaskIsFocusOfDay] = useState(false);
  const [newTaskIsRandomDistribution, setNewTaskIsRandomDistribution] = useState(false);
  const [newTaskAutoApprove, setNewTaskAutoApprove] = useState(false);
  const [newTaskTrack, setNewTaskTrack] = useState('');
  
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPoints, setEditTaskPoints] = useState('20');
  const [editTaskDeadline, setEditTaskDeadline] = useState('');
  const [editTaskAllowMultiple, setEditTaskAllowMultiple] = useState(false);
  const [editTaskRequiresPhoto, setEditTaskRequiresPhoto] = useState(false);
  const [editTaskSendNotification, setEditTaskSendNotification] = useState(true);
  const [editTaskIsFocusOfDay, setEditTaskIsFocusOfDay] = useState(false);

  const [newReflectionText, setNewReflectionText] = useState('');
  const [newReflectionType, setNewReflectionType] = useState('evening');
  const [newReflectionPublishTime, setNewReflectionPublishTime] = useState('');
  const [newReflectionEndTime, setNewReflectionEndTime] = useState('');
  const [newReflectionPoints, setNewReflectionPoints] = useState('10');
  const [newReflectionSendNotification, setNewReflectionSendNotification] = useState(true);
  const [newReflectionGroupId, setNewReflectionGroupId] = useState('');
  const [newReflectionTrack, setNewReflectionTrack] = useState('');

  const [editingReflectionId, setEditingReflectionId] = useState<number | null>(null);
  const [editReflectionText, setEditReflectionText] = useState('');
  const [editReflectionPublishTime, setEditReflectionPublishTime] = useState('');
  const [editReflectionEndTime, setEditReflectionEndTime] = useState('');
  const [editReflectionPoints, setEditReflectionPoints] = useState('10');

  const [pushText, setPushText] = useState('');
  const [pushImage, setPushImage] = useState<string | null>(null);
  const [pushImageUrl, setPushImageUrl] = useState('');
  const [pushImageError, setPushImageError] = useState<string | null>(null);
  const [pushUploading, setPushUploading] = useState(false);
  const [pushTarget, setPushTarget] = useState<'all' | 'track' | 'user'>('all');
  const [pushTracks, setPushTracks] = useState<string[]>([TRACKS[0]]);
  const [pushUserId, setPushUserId] = useState('');
  const [pushScheduledAt, setPushScheduledAt] = useState('');

  const handleUploadPushImage = async () => {
    setPushUploading(true);
    setPushImageError(null);
    try {
      const picked = await pickImage();
      if (!picked) {
        setPushImageError('Не удалось выбрать фото. Попробуй JPG или PNG до 10 МБ.');
        return;
      }
      if (picked.startsWith('data:')) {
        setPushImageError('Для рассылки нужна ссылка на изображение. На десктопе вставьте URL в поле ниже.');
        return;
      }
      setPushImage(picked);
      setPushImageUrl('');
    } catch (e) {
      console.error('Upload failed:', e);
      setPushImageError('Не удалось прикрепить фото.');
    } finally {
      setPushUploading(false);
    }
  };

  const resolvePushImage = (): string | undefined => {
    const uploaded = pushImage?.trim();
    if (uploaded && (uploaded.startsWith('http://') || uploaded.startsWith('https://'))) {
      return uploaded;
    }
    const manual = pushImageUrl.trim();
    if (manual && (manual.startsWith('http://') || manual.startsWith('https://'))) {
      return manual;
    }
    return undefined;
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchAdminEvents(),
      fetchAdminTasks(),
      fetchPendingExchange(),
      fetchPendingSubmissions(),
      fetchReflectionQuestions(),
      fetchBroadcasts(),
      fetchDiagnosticsSettings(),
      fetchDiagnosticsResults(),
      fetchExchangeActivity(),
    ])
      .then(([e, t, q, s, r, b, ds, dr, ea]) => {
        setEvents(e.events);
        setTasks(t.tasks);
        setQuestions(q.questions);
        setSubmissions(s.submissions);
        setReflections(r.questions);
        setBroadcasts(b.broadcasts);
        setDiagTracks(ds.tracks);
        setDiagResults(dr.results);
        setExchangeActivity(ea.activity);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const tabBadges = useMemo(
    () => ({
      exchange: questions.length,
      submissions: submissions.length,
    }),
    [questions.length, submissions.length],
  );

  if (user?.role !== 'admin') {
    return (
      <Panel id="admin">
        <GradientHeader title="Админка" />
        <div className="nfo-bg nfo-admin">
          <Div style={{ padding: 24 }}>
            <button type="button" className="nfo-admin-btn-outline" onClick={() => navigate('/home')}>
              ← Назад
            </button>
          </Div>
          <div className="nfo-admin-empty">Доступ только для администраторов</div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel id="admin">
      <GradientHeader title="Админка ⚙️" subtitle="Управление форумом">
        <Div style={{ marginTop: 8 }}>
          <button type="button" className="nfo-admin-btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)' }} onClick={() => navigate('/home')}>
            ← На главную
          </button>
        </Div>
      </GradientHeader>
      <div className="nfo-bg nfo-admin">
      <AdminTabNav activeTab={tab} onChange={setTab} badges={tabBadges} />
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></Div>
      ) : tab === 'events' ? (
        <div className="nfo-admin-section">
          <div className="nfo-sec-title">Новое событие</div>
          <div className="nfo-admin-form-card">
          <FormItem top="Название">
            <Input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} />
          </FormItem>
          <FormItem top="Описание">
            <Textarea value={newEventDesc} onChange={(e) => setNewEventDesc(e.target.value)} />
          </FormItem>
          <FormItem top="Место проведения">
            <Input value={newEventPlace} onChange={(e) => setNewEventPlace(e.target.value)} />
          </FormItem>
          <FormItem top="Время начала">
            <Input type="datetime-local" value={newEventStartTime} onChange={(e) => setNewEventStartTime(e.target.value)} />
          </FormItem>
          <FormItem top="Время окончания">
            <Input type="datetime-local" value={newEventEndTime} onChange={(e) => setNewEventEndTime(e.target.value)} />
          </FormItem>
          <FormItem top="Трек">
            <NativeSelect value={newEventTrack} onChange={(e) => setNewEventTrack(e.target.value)}>
              <option value="">Все</option>
              {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </FormItem>
          <FormItem top="Ключевой блок (напоминания + «Что далее»)">
            <Checkbox checked={newEventIsKeyBlock} onChange={(e) => setNewEventIsKeyBlock(e.target.checked)}>
              Ключевой блок
            </Checkbox>
          </FormItem>
          <button
            type="button"
            className="nfo-admin-btn-primary"
            onClick={() => void createAdminEvent({
              title: newEventTitle,
              description: newEventDesc || undefined,
              startTime: newEventStartTime ? new Date(newEventStartTime).toISOString() : new Date().toISOString(),
              endTime: newEventEndTime ? new Date(newEventEndTime).toISOString() : new Date().toISOString(),
              place: newEventPlace || undefined,
              track: newEventTrack || null,
              isKeyBlock: newEventIsKeyBlock,
            }).then(() => { 
              setNewEventTitle(''); 
              setNewEventDesc(''); 
              setNewEventPlace('');
              setNewEventStartTime('');
              setNewEventEndTime('');
              setNewEventIsKeyBlock(false);
              load();
            })}
          >
            Добавить событие
          </button>
          </div>

          <div className="nfo-sec-title" style={{ marginTop: 8 }}>Список событий</div>
          {events.length === 0 && <div className="nfo-admin-empty">Нет событий</div>}
          {events.map((ev) => (
            <AdminListCard
              key={ev.id}
              title={editingEventId === ev.id ? 'Редактирование' : ev.title}
              meta={editingEventId !== ev.id ? `${new Date(ev.startTime).toLocaleString('ru-RU')} – ${new Date(ev.endTime).toLocaleTimeString('ru-RU')}${ev.place ? ` · ${ev.place}` : ''}` : undefined}
              actions={editingEventId !== ev.id ? (
                <>
                  <button
                    type="button"
                    className="nfo-admin-btn-outline"
                    onClick={() => {
                      setEditingEventId(ev.id);
                      setEditEventTitle(ev.title);
                      setEditEventDesc(ev.description ?? '');
                      setEditEventPlace(ev.place ?? '');
                      setEditEventStartTime(new Date(ev.startTime).toISOString().slice(0, 16));
                      setEditEventEndTime(new Date(ev.endTime).toISOString().slice(0, 16));
                      setEditEventIsKeyBlock(ev.isKeyBlock ?? false);
                    }}
                  >
                    Изменить
                  </button>
                  <button type="button" className="nfo-admin-btn-danger" onClick={() => void deleteAdminEvent(ev.id).then(load)}>
                    Удалить
                  </button>
                </>
              ) : undefined}
            >
              {editingEventId === ev.id ? (
                <div>
                  <FormItem top="Название"><Input value={editEventTitle} onChange={(e) => setEditEventTitle(e.target.value)} /></FormItem>
                  <FormItem top="Описание"><Textarea value={editEventDesc} onChange={(e) => setEditEventDesc(e.target.value)} /></FormItem>
                  <FormItem top="Место"><Input value={editEventPlace} onChange={(e) => setEditEventPlace(e.target.value)} /></FormItem>
                  <FormItem top="Начало"><Input type="datetime-local" value={editEventStartTime} onChange={(e) => setEditEventStartTime(e.target.value)} /></FormItem>
                  <FormItem top="Окончание"><Input type="datetime-local" value={editEventEndTime} onChange={(e) => setEditEventEndTime(e.target.value)} /></FormItem>
                  <FormItem top="Ключевой блок">
                    <Checkbox checked={editEventIsKeyBlock} onChange={(e) => setEditEventIsKeyBlock(e.target.checked)}>Ключевой блок</Checkbox>
                  </FormItem>
                  <div className="nfo-admin-actions">
                    <button
                      type="button"
                      className="nfo-admin-btn-primary"
                      onClick={() => void updateAdminEvent(ev.id, {
                        title: editEventTitle,
                        description: editEventDesc,
                        place: editEventPlace,
                        startTime: new Date(editEventStartTime).toISOString(),
                        endTime: new Date(editEventEndTime).toISOString(),
                        isKeyBlock: editEventIsKeyBlock,
                      }).then(() => { setEditingEventId(null); load(); })}
                    >
                      Сохранить
                    </button>
                    <button type="button" className="nfo-admin-btn-secondary" onClick={() => setEditingEventId(null)}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : null}
            </AdminListCard>
          ))}
        </div>
      ) : tab === 'tasks' ? (
        <div className="nfo-admin-section">
          <div className="nfo-sec-title">Новое задание</div>
          <div className="nfo-admin-form-card">
          <FormItem top="Название">
            <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
          </FormItem>
          <FormItem top="Описание">
            <Textarea value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} />
          </FormItem>
          <FormItem top="Баллы">
            <Input type="number" value={newTaskPoints} onChange={(e) => setNewTaskPoints(e.target.value)} />
          </FormItem>
          <FormItem top="Дедлайн (необязательно)">
            <Input type="datetime-local" value={newTaskDeadline} onChange={(e) => setNewTaskDeadline(e.target.value)} />
          </FormItem>
          <FormItem top="Многократное выполнение">
            <NativeSelect value={newTaskAllowMultiple ? 'yes' : 'no'} onChange={(e) => setNewTaskAllowMultiple(e.target.value === 'yes')}>
              <option value="no">Нет</option>
              <option value="yes">Да</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Требуется фото">
            <NativeSelect value={newTaskRequiresPhoto ? 'yes' : 'no'} onChange={(e) => setNewTaskRequiresPhoto(e.target.value === 'yes')}>
              <option value="no">Нет</option>
              <option value="yes">Да</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Нетворкинг (рандом-пара)">
            <NativeSelect value={newTaskIsRandomDistribution ? 'yes' : 'no'} onChange={(e) => setNewTaskIsRandomDistribution(e.target.value === 'yes')}>
              <option value="no">Нет</option>
              <option value="yes">Да</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Авто-подтверждение">
            <NativeSelect value={newTaskAutoApprove ? 'yes' : 'no'} onChange={(e) => setNewTaskAutoApprove(e.target.value === 'yes')}>
              <option value="no">Нет</option>
              <option value="yes">Да</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Фокус дня">
            <NativeSelect value={newTaskIsFocusOfDay ? 'yes' : 'no'} onChange={(e) => setNewTaskIsFocusOfDay(e.target.value === 'yes')}>
              <option value="no">Нет</option>
              <option value="yes">Да</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Трек">
            <NativeSelect value={newTaskTrack} onChange={(e) => setNewTaskTrack(e.target.value)}>
              <option value="">Все</option>
              {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </FormItem>
          <FormItem top="Отправить push-уведомление">
            <NativeSelect value={newTaskSendNotification ? 'yes' : 'no'} onChange={(e) => setNewTaskSendNotification(e.target.value === 'yes')}>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </NativeSelect>
          </FormItem>
          <button
            type="button"
            className="nfo-admin-btn-primary"
            onClick={() => void createAdminTask({
              title: newTaskTitle,
              description: newTaskDesc || newTaskTitle,
              points: Number(newTaskPoints) || 20,
              deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null,
              allowMultiple: newTaskAllowMultiple,
              requiresPhoto: newTaskRequiresPhoto,
              sendNotification: newTaskSendNotification,
              isFocusOfDay: newTaskIsFocusOfDay,
              isRandomDistribution: newTaskIsRandomDistribution,
              autoApprove: newTaskAutoApprove,
              track: newTaskTrack || null,
            }).then(() => {
              setNewTaskTitle('');
              setNewTaskDesc('');
              setNewTaskDeadline('');
              load();
            })}
          >
            Добавить задание
          </button>
          </div>

          <div className="nfo-sec-title" style={{ marginTop: 8 }}>Список заданий</div>
          {tasks.length === 0 && <div className="nfo-admin-empty">Нет заданий</div>}
          {tasks.map((t) => (
            <AdminListCard
              key={t.id}
              badge={t.isFocusOfDay && editingTaskId !== t.id ? <Badge mode="prominent">Фокус дня</Badge> : undefined}
              title={editingTaskId === t.id ? 'Редактирование' : t.title}
              meta={editingTaskId !== t.id ? `${t.points} б.${t.deadline ? ` · до ${new Date(t.deadline).toLocaleString('ru-RU')}` : ''}` : undefined}
              actions={editingTaskId !== t.id ? (
                <>
                  <button
                    type="button"
                    className="nfo-admin-btn-outline"
                    onClick={() => {
                      setEditingTaskId(t.id);
                      setEditTaskTitle(t.title);
                      setEditTaskDesc(t.description);
                      setEditTaskPoints(String(t.points));
                      setEditTaskDeadline(t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : '');
                      setEditTaskAllowMultiple(t.allowMultiple ?? false);
                      setEditTaskRequiresPhoto(t.requiresPhoto ?? false);
                      setEditTaskSendNotification(t.sendNotification ?? true);
                      setEditTaskIsFocusOfDay(t.isFocusOfDay ?? false);
                    }}
                  >
                    Изменить
                  </button>
                  <button type="button" className="nfo-admin-btn-danger" onClick={() => void deleteAdminTask(t.id).then(load)}>
                    Удалить
                  </button>
                </>
              ) : undefined}
            >
              {editingTaskId === t.id ? (
                <div>
                  <FormItem top="Название"><Input value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} /></FormItem>
                  <FormItem top="Описание"><Textarea value={editTaskDesc} onChange={(e) => setEditTaskDesc(e.target.value)} /></FormItem>
                  <FormItem top="Баллы"><Input type="number" value={editTaskPoints} onChange={(e) => setEditTaskPoints(e.target.value)} /></FormItem>
                  <FormItem top="Дедлайн"><Input type="datetime-local" value={editTaskDeadline} onChange={(e) => setEditTaskDeadline(e.target.value)} /></FormItem>
                  <FormItem top="Многократное"><NativeSelect value={editTaskAllowMultiple ? 'yes' : 'no'} onChange={(e) => setEditTaskAllowMultiple(e.target.value === 'yes')}><option value="no">Нет</option><option value="yes">Да</option></NativeSelect></FormItem>
                  <FormItem top="Требует фото"><NativeSelect value={editTaskRequiresPhoto ? 'yes' : 'no'} onChange={(e) => setEditTaskRequiresPhoto(e.target.value === 'yes')}><option value="no">Нет</option><option value="yes">Да</option></NativeSelect></FormItem>
                  <FormItem top="Фокус дня"><NativeSelect value={editTaskIsFocusOfDay ? 'yes' : 'no'} onChange={(e) => setEditTaskIsFocusOfDay(e.target.value === 'yes')}><option value="no">Нет</option><option value="yes">Да</option></NativeSelect></FormItem>
                  <div className="nfo-admin-actions">
                    <button
                      type="button"
                      className="nfo-admin-btn-primary"
                      onClick={() => void updateAdminTask(t.id, {
                        title: editTaskTitle,
                        description: editTaskDesc,
                        points: Number(editTaskPoints) || 20,
                        deadline: editTaskDeadline ? new Date(editTaskDeadline).toISOString() : null,
                        allowMultiple: editTaskAllowMultiple,
                        requiresPhoto: editTaskRequiresPhoto,
                        sendNotification: editTaskSendNotification,
                        isFocusOfDay: editTaskIsFocusOfDay,
                      }).then(() => { setEditingTaskId(null); load(); })}
                    >
                      Сохранить
                    </button>
                    <button type="button" className="nfo-admin-btn-secondary" onClick={() => setEditingTaskId(null)}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : null}
            </AdminListCard>
          ))}
        </div>
      ) : tab === 'exchange' ? (
        <div className="nfo-admin-section">
          <div className="nfo-sec-title">Модерация вопросов</div>
          {questions.length === 0 ? (
            <div className="nfo-admin-empty">Нет вопросов на модерации</div>
          ) : (
            questions.map((q) => (
              <AdminListCard key={q.id} title={q.text}>
                <FormItem top="Время отправки (пусто = сейчас)">
                  <Input type="datetime-local" id={`publish-time-${q.id}`} />
                </FormItem>
                <div className="nfo-admin-actions">
                  <button
                    type="button"
                    className="nfo-admin-btn-primary stretched"
                    onClick={() => {
                      const timeInput = document.getElementById(`publish-time-${q.id}`) as HTMLInputElement;
                      const publishTime = timeInput?.value ? new Date(timeInput.value).toISOString() : undefined;
                      void moderateExchange(q.id, 'approved', publishTime).then(load);
                    }}
                  >
                    Одобрить
                  </button>
                  <button type="button" className="nfo-admin-btn-secondary stretched" onClick={() => void moderateExchange(q.id, 'rejected').then(load)}>
                    Отклонить
                  </button>
                </div>
              </AdminListCard>
            ))
          )}

          <div className="nfo-sec-title" style={{ marginTop: 12 }}>Активность по вопросам</div>
          {!exchangeActivity.length && <div className="nfo-admin-empty">Нет опубликованных вопросов</div>}
          {exchangeActivity.map((a) => (
            <AdminListCard
              key={a.id}
              title={a.text}
              meta={`${a.status} · ${a.answerCount} ответов · ${a.assignmentCount} назначений`}
              actions={a.status === 'published' ? (
                <button type="button" className="nfo-admin-btn-secondary stretched" onClick={() => void hideExchangeQuestion(a.id).then(load)}>
                  Скрыть вопрос
                </button>
              ) : undefined}
            />
          ))}
        </div>
      ) : tab === 'submissions' ? (
        <div className="nfo-admin-section">
          <div className="nfo-sec-title">Модерация заданий</div>
          {submissions.length === 0 ? (
            <div className="nfo-admin-empty">Нет ответов на проверке</div>
          ) : (
            submissions.map((s) => (
              <AdminListCard key={s.id} title={s.taskTitle ?? `Задание #${s.taskId}`} meta={s.userName ?? 'Участник'}>
                <div style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.4 }}>{s.answerText}</div>
                {s.photos?.map((url, i) => (
                  <img key={i} src={url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
                ))}
                <FormItem top="Комментарий при отклонении">
                  <Input
                    value={submissionComments[s.id] ?? ''}
                    onChange={(e) => setSubmissionComments((c) => ({ ...c, [s.id]: e.target.value }))}
                    placeholder="Необязательно"
                  />
                </FormItem>
                <div className="nfo-admin-actions">
                  <button type="button" className="nfo-admin-btn-primary stretched" onClick={() => void moderateSubmission(s.id, 'approved').then(load)}>
                    Принять
                  </button>
                  <button type="button" className="nfo-admin-btn-secondary stretched" onClick={() => void moderateSubmission(s.id, 'rejected', submissionComments[s.id]).then(load)}>
                    Отклонить
                  </button>
                </div>
              </AdminListCard>
            ))
          )}
        </div>
      ) : tab === 'reflection' ? (
        <div className="nfo-admin-section">
          <div className="nfo-sec-title">Новый вопрос</div>
          <div className="nfo-admin-form-card">
          <FormItem top="Текст вопроса">
            <Textarea value={newReflectionText} onChange={(e) => setNewReflectionText(e.target.value)} />
          </FormItem>
          <FormItem top="Тип">
            <NativeSelect value={newReflectionType} onChange={(e) => setNewReflectionType(e.target.value)}>
              <option value="evening">Вечерняя рефлексия</option>
              <option value="state">Состояние (чек-ин)</option>
              <option value="block">После блока</option>
              <option value="track">Трек</option>
              <option value="entry">Входной</option>
              <option value="daily">Ежедневный</option>
              <option value="final">Финальный</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Время публикации">
            <Input type="datetime-local" value={newReflectionPublishTime} onChange={(e) => setNewReflectionPublishTime(e.target.value)} />
          </FormItem>
          <FormItem top="Время закрытия (необязательно)">
            <Input type="datetime-local" value={newReflectionEndTime} onChange={(e) => setNewReflectionEndTime(e.target.value)} />
          </FormItem>
          <FormItem top="Баллы за ответ">
            <Input type="number" value={newReflectionPoints} onChange={(e) => setNewReflectionPoints(e.target.value)} />
          </FormItem>
          <FormItem top="Отправить push-уведомление">
            <NativeSelect value={newReflectionSendNotification ? 'yes' : 'no'} onChange={(e) => setNewReflectionSendNotification(e.target.value === 'yes')}>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="ID группы (для подвопросов, необязательно)">
            <Input value={newReflectionGroupId} onChange={(e) => setNewReflectionGroupId(e.target.value)} placeholder="Например: evening-day1" />
          </FormItem>
          <FormItem top="Трек">
            <NativeSelect value={newReflectionTrack} onChange={(e) => setNewReflectionTrack(e.target.value)}>
              <option value="">Все</option>
              {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </FormItem>
          <button
            type="button"
            className="nfo-admin-btn-primary"
            onClick={() => void createReflectionQuestion({
              text: newReflectionText,
              type: newReflectionType,
              publishTime: newReflectionPublishTime ? new Date(newReflectionPublishTime).toISOString() : new Date().toISOString(),
              endTime: newReflectionEndTime ? new Date(newReflectionEndTime).toISOString() : null,
              points: Number(newReflectionPoints) || 10,
              sendNotification: newReflectionSendNotification,
              groupId: newReflectionGroupId || null,
              track: newReflectionTrack || null,
            }).then(() => {
              setNewReflectionText('');
              setNewReflectionPublishTime('');
              setNewReflectionEndTime('');
              setNewReflectionGroupId('');
              load();
            })}
          >
            Добавить вопрос
          </button>
          </div>

          <div className="nfo-sec-title" style={{ marginTop: 8 }}>Список вопросов</div>
          {reflections.map((r) => (
            editingReflectionId === r.id ? (
              <div key={r.id} className="nfo-admin-list-card">
                <FormItem top="Текст"><Textarea value={editReflectionText} onChange={(e) => setEditReflectionText(e.target.value)} /></FormItem>
                <FormItem top="Публикация"><Input type="datetime-local" value={editReflectionPublishTime} onChange={(e) => setEditReflectionPublishTime(e.target.value)} /></FormItem>
                <FormItem top="Закрытие"><Input type="datetime-local" value={editReflectionEndTime} onChange={(e) => setEditReflectionEndTime(e.target.value)} /></FormItem>
                <FormItem top="Баллы"><Input type="number" value={editReflectionPoints} onChange={(e) => setEditReflectionPoints(e.target.value)} /></FormItem>
                <div className="nfo-admin-actions">
                  <button type="button" className="nfo-admin-btn-primary" onClick={() => void updateReflectionQuestion(r.id, {
                    text: editReflectionText,
                    publishTime: new Date(editReflectionPublishTime).toISOString(),
                    endTime: editReflectionEndTime ? new Date(editReflectionEndTime).toISOString() : null,
                    points: Number(editReflectionPoints) || 10,
                  }).then(() => { setEditingReflectionId(null); load(); })}>Сохранить</button>
                  <button type="button" className="nfo-admin-btn-secondary" onClick={() => setEditingReflectionId(null)}>Отмена</button>
                </div>
              </div>
            ) : (
              <AdminListCard
                key={r.id}
                badge={r.groupId ? <Badge mode="prominent">Группа {r.groupId}</Badge> : undefined}
                title={r.text}
                meta={`${r.type} · ${new Date(r.publishTime).toLocaleString('ru-RU')}${r.endTime ? ` – ${new Date(r.endTime).toLocaleString('ru-RU')}` : ''} · ${r.points} б.`}
                actions={
                  <>
                    <button
                      type="button"
                      className="nfo-admin-btn-outline"
                      onClick={() => {
                        setEditingReflectionId(r.id);
                        setEditReflectionText(r.text);
                        setEditReflectionPublishTime(new Date(r.publishTime).toISOString().slice(0, 16));
                        setEditReflectionEndTime(r.endTime ? new Date(r.endTime).toISOString().slice(0, 16) : '');
                        setEditReflectionPoints(String(r.points));
                      }}
                    >
                      Изменить
                    </button>
                    <button type="button" className="nfo-admin-btn-danger" onClick={() => void deleteReflectionQuestion(r.id).then(load)}>
                      Удалить
                    </button>
                  </>
                }
              />
            )
          ))}
        </div>
      ) : tab === 'push' ? (
        <div className="nfo-admin-section">
          <div className="nfo-sec-title">Рассылка</div>
          <div className="nfo-admin-form-card">
          <FormItem top="Текст сообщения">
            <Textarea value={pushText} onChange={(e) => setPushText(e.target.value)} />
          </FormItem>
          <FormItem top="Изображение (необязательно)">
            {pushImage ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={pushImage} alt="Превью" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                <button
                  type="button"
                  className="nfo-admin-btn-danger"
                  style={{ position: 'absolute', top: 4, right: 4, padding: '2px 8px', fontSize: 11 }}
                  onClick={() => { setPushImage(null); setPushImageError(null); }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <Button mode="secondary" loading={pushUploading} onClick={() => void handleUploadPushImage()}>
                Прикрепить фото
              </Button>
            )}
            {pushImageError && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#e74c3c' }}>{pushImageError}</div>
            )}
          </FormItem>
          <FormItem top="Или ссылка на изображение (https)">
            <Input
              value={pushImageUrl}
              placeholder="https://..."
              onChange={(e) => {
                setPushImageUrl(e.target.value);
                setPushImageError(null);
              }}
            />
          </FormItem>
          <FormItem top="Аудитория">
            <NativeSelect value={pushTarget} onChange={(e) => setPushTarget(e.target.value as 'all' | 'track' | 'user')}>
              <option value="all">Все</option>
              <option value="track">Трек</option>
              <option value="user">Конкретный участник</option>
            </NativeSelect>
          </FormItem>
          {pushTarget === 'track' && (
            <FormItem top="Треки">
              {TRACKS.map((t) => (
                <Checkbox
                  key={t}
                  checked={pushTracks.includes(t)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPushTracks([...pushTracks, t]);
                    } else {
                      setPushTracks(pushTracks.filter((tr) => tr !== t));
                    }
                  }}
                >
                  {t}
                </Checkbox>
              ))}
            </FormItem>
          )}
          {pushTarget === 'user' && (
            <FormItem top="ID участника (внутренний)">
              <Input type="number" value={pushUserId} onChange={(e) => setPushUserId(e.target.value)} />
            </FormItem>
          )}
          <FormItem top="Отложенная отправка (необязательно)">
            <Input type="datetime-local" value={pushScheduledAt} onChange={(e) => setPushScheduledAt(e.target.value)} />
          </FormItem>
          <button
            type="button"
            className="nfo-admin-btn-primary stretched"
            onClick={() => {
              const image = resolvePushImage();
              if (pushImageUrl.trim() && !image) {
                setPushImageError('Укажите корректную ссылку, начинающуюся с https://');
                return;
              }
              void sendAdminPush({
              text: pushText,
              image,
              target_type: pushTarget,
              target_tracks: pushTarget === 'track' && pushTracks.length ? pushTracks : undefined,
              target_user_id: pushTarget === 'user' ? Number(pushUserId) : undefined,
              scheduled_at: pushScheduledAt ? new Date(pushScheduledAt).toISOString() : undefined,
            }).then(() => {
              setPushText('');
              setPushImage(null);
              setPushImageUrl('');
              setPushImageError(null);
              setPushUserId('');
              setPushScheduledAt('');
              load();
            });
            }}
          >
            Отправить
          </button>
          </div>

          <div className="nfo-sec-title" style={{ marginTop: 12 }}>История рассылок</div>
          {broadcasts.length === 0 && <div className="nfo-admin-empty">Нет рассылок</div>}
          {broadcasts.map((b) => (
            <AdminListCard
              key={b.id}
              title={b.text}
              meta={`${b.targetType} · ${
                !b.sentAt && b.scheduledAt
                  ? `Ожидает отправки: ${new Date(b.scheduledAt).toLocaleString('ru-RU')}`
                  : `Отправлено: ${new Date(b.sentAt || b.createdAt).toLocaleString('ru-RU')}`
              }`}
            />
          ))}
        </div>
      ) : tab === 'diagnostics' ? (
        <div className="nfo-admin-section">
          <div className="nfo-sec-title">Самодиагностика тренера</div>
          <div className="nfo-admin-form-card">
          <FormItem top="Доступна для треков">
            {TRACKS.map(t => (
              <Checkbox
                key={t}
                checked={diagTracks.includes(t)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDiagTracks([...diagTracks, t]);
                  } else {
                    setDiagTracks(diagTracks.filter(track => track !== t));
                  }
                }}
              >
                {t}
              </Checkbox>
            ))}
          </FormItem>
          <button type="button" className="nfo-admin-btn-primary" onClick={() => void saveDiagnosticsSettings(diagTracks).then(load)}>
            Сохранить настройки
          </button>
          </div>

          <div className="nfo-admin-actions" style={{ marginTop: 12 }}>
            <a className="nfo-admin-btn-secondary stretched" href={getDiagnosticsExportUrl()} target="_blank" rel="noreferrer">
              Скачать результаты (CSV)
            </a>
          </div>

          <div className="nfo-sec-title" style={{ marginTop: 12 }}>Последние результаты</div>
          {diagResults.length === 0 && <div className="nfo-admin-empty">Нет результатов</div>}
          {diagResults.slice(0, 50).map(r => (
            <AdminListCard
              key={r.id}
              title={`${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || 'Участник'}
              meta={`${r.user?.track ?? '—'} · ${new Date(r.createdAt).toLocaleString('ru-RU')} · Блок ${r.blockId} · Попытка ${r.attemptNumber}`}
              actions={<span style={{ fontWeight: 700, color: 'var(--nfo-primary)', fontSize: 14 }}>{r.score}/5</span>}
            />
          ))}
        </div>
      ) : tab === 'users' ? (
        <AdminUsersTab />
      ) : tab === 'feedback' ? (
        <AdminFeedbackTab />
      ) : tab === 'reflection-answers' ? (
        <AdminReflectionAnswersTab />
      ) : tab === 'nfo-stats' ? (
        <AdminNfoStatsTab />
      ) : tab === 'activity' ? (
        <AdminActivityTab />
      ) : tab === 'settings' ? (
        <AdminSettingsTab />
      ) : null}
      </div>
    </Panel>
  );
}
