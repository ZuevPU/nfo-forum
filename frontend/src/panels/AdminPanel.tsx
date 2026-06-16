import {
  Button,
  Div,
  FormItem,
  Group,
  Input,
  NativeSelect,
  Panel,
  PanelHeader,
  Placeholder,
  SegmentedControl,
  SimpleCell,
  Spinner,
  Textarea,
  Badge,
  Checkbox,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PanelTitle } from '../components/PanelTitle';
import { TRACKS } from '../constants/tracks';
import { useAuthContext } from '../contexts/AuthContext';
import { uploadFiles } from '../lib/vk-bridge';

type Tab = 'events' | 'tasks' | 'exchange' | 'submissions' | 'reflection' | 'push' | 'diagnostics' | 'users' | 'feedback' | 'settings' | 'reflection-answers' | 'nfo-stats' | 'activity';

export function AdminPanel() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('events');
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
  const [pushUploading, setPushUploading] = useState(false);
  const [pushTarget, setPushTarget] = useState<'all' | 'track' | 'user'>('all');
  const [pushTracks, setPushTracks] = useState<string[]>([TRACKS[0]]);
  const [pushUserId, setPushUserId] = useState('');
  const [pushScheduledAt, setPushScheduledAt] = useState('');

  const handleUploadPushImage = async () => {
    setPushUploading(true);
    try {
      const urls = await uploadFiles(1);
      if (urls.length > 0) {
        setPushImage(urls[0]);
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setPushUploading(false);
    }
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

  if (user?.role !== 'admin') {
    return (
      <Panel id="admin">
        <PanelHeader before={<Button mode="tertiary" onClick={() => navigate('/home')}>Назад</Button>}>
          <PanelTitle title="Админка" />
        </PanelHeader>
        <Placeholder>Доступ только для администраторов</Placeholder>
      </Panel>
    );
  }

  const today = new Date();
  const start = new Date(today);
  start.setHours(10, 0, 0, 0);
  const end = new Date(today);
  end.setHours(11, 0, 0, 0);

  return (
    <Panel id="admin">
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigate('/home')}>Назад</Button>}>
        <PanelTitle title="Админка" subtitle="Управление форумом" />
      </PanelHeader>
      <Group>
        <Div>
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            options={[
              { label: 'События', value: 'events' },
              { label: 'Задания', value: 'tasks' },
              { label: 'Обмен', value: 'exchange' },
              { label: 'Ответы', value: 'submissions' },
              { label: 'Вопросы', value: 'reflection' },
              { label: 'Push', value: 'push' },
              { label: 'Диагностика', value: 'diagnostics' },
              { label: 'Участники', value: 'users' },
              { label: 'Inbox', value: 'feedback' },
              { label: 'Рефл. ответы', value: 'reflection-answers' },
              { label: 'НФО день', value: 'nfo-stats' },
              { label: 'Активность', value: 'activity' },
              { label: 'Настройки', value: 'settings' },
            ]}
          />
        </Div>
      </Group>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></Div>
      ) : tab === 'events' ? (
        <Group header="События">
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
          <Div>
            <Button
              size="m"
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
              Добавить
            </Button>
          </Div>
          {events.map((ev) => (
            <SimpleCell
              key={ev.id}
              multiline
              subtitle={`${new Date(ev.startTime).toLocaleString('ru-RU')} - ${new Date(ev.endTime).toLocaleTimeString('ru-RU')} ${ev.place ? `· ${ev.place}` : ''}`}
              after={
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button
                    size="s"
                    mode="outline"
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
                    Изм.
                  </Button>
                  <Button size="s" mode="outline" onClick={() => void deleteAdminEvent(ev.id).then(load)}>Удалить</Button>
                </div>
              }
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
                  <Button
                    size="s"
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
                  </Button>
                </div>
              ) : ev.title}
            </SimpleCell>
          ))}
        </Group>
      ) : tab === 'tasks' ? (
        <Group header="Задания">
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
          <Div>
            <Button
              size="m"
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
              Добавить
            </Button>
          </Div>
          {tasks.map((t) => (
            <SimpleCell
              key={t.id}
              multiline
              subtitle={`${t.points} б. ${t.deadline ? `· До ${new Date(t.deadline).toLocaleString('ru-RU')}` : ''}`}
              after={
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button
                    size="s"
                    mode="outline"
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
                    Изм.
                  </Button>
                  <Button size="s" mode="outline" onClick={() => void deleteAdminTask(t.id).then(load)}>Удалить</Button>
                </div>
              }
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
                  <Button
                    size="s"
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
                  </Button>
                </div>
              ) : (
                <>
                  {t.isFocusOfDay ? <Badge mode="prominent" style={{ display: 'inline-block', marginRight: 8 }}>Фокус дня</Badge> : null}
                  {t.title}
                </>
              )}
            </SimpleCell>
          ))}
        </Group>
      ) : tab === 'exchange' ? (
        <>
        <Group header="Модерация вопросов">
          {questions.length === 0 ? (
            <Placeholder>Нет вопросов на модерации</Placeholder>
          ) : (
            questions.map((q) => (
              <Div key={q.id} style={{ padding: '8px 16px' }}>
                <div className="nfo-card" style={{ margin: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 12 }}>{q.text}</div>
                  <FormItem top="Время отправки (оставьте пустым для отправки сейчас)">
                    <Input 
                      type="datetime-local" 
                      id={`publish-time-${q.id}`}
                    />
                  </FormItem>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="m" stretched onClick={() => {
                      const timeInput = document.getElementById(`publish-time-${q.id}`) as HTMLInputElement;
                      const publishTime = timeInput?.value ? new Date(timeInput.value).toISOString() : undefined;
                      void moderateExchange(q.id, 'approved', publishTime).then(load);
                    }}>Одобрить</Button>
                    <Button size="m" mode="secondary" stretched onClick={() => void moderateExchange(q.id, 'rejected').then(load)}>Отклонить</Button>
                  </div>
                </div>
              </Div>
            ))
          )}
        </Group>
        <Group header="Активность по вопросам">
          {exchangeActivity.map((a) => (
            <Div key={a.id} style={{ padding: '8px 16px' }}>
              <div className="nfo-card" style={{ margin: 0 }}>
                <SimpleCell subtitle={`${a.status} · ${a.answerCount} ответов · ${a.assignmentCount} назначений`} multiline>
                  {a.text}
                </SimpleCell>
                {a.status === 'published' && (
                  <Button size="s" mode="secondary" stretched onClick={() => void hideExchangeQuestion(a.id).then(load)}>
                    Скрыть вопрос
                  </Button>
                )}
              </div>
            </Div>
          ))}
          {!exchangeActivity.length && <Placeholder>Нет опубликованных вопросов</Placeholder>}
        </Group>
        </>
      ) : tab === 'submissions' ? (
        <Group header="Модерация заданий">
          {submissions.length === 0 ? (
            <Placeholder>Нет ответов на проверке</Placeholder>
          ) : (
            submissions.map((s) => (
              <Div key={s.id} style={{ padding: '8px 16px' }}>
                <div className="nfo-card" style={{ margin: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.taskTitle ?? `Задание #${s.taskId}`}</div>
                  <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginBottom: 8 }}>{s.userName ?? 'Участник'}</div>
                  <div style={{ marginBottom: 8 }}>{s.answerText}</div>
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="m" stretched onClick={() => void moderateSubmission(s.id, 'approved').then(load)}>✓ Принять</Button>
                    <Button size="m" mode="secondary" stretched onClick={() => void moderateSubmission(s.id, 'rejected', submissionComments[s.id]).then(load)}>✕ Отклонить</Button>
                  </div>
                </div>
              </Div>
            ))
          )}
        </Group>
      ) : tab === 'reflection' ? (
        <Group header="Вопросы и Рефлексия">
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
          <Div>
            <Button
              size="m"
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
            </Button>
          </Div>
          {reflections.map((r) => (
            <Div key={r.id} style={{ padding: '8px 16px' }}>
              {editingReflectionId === r.id ? (
                <div className="nfo-card" style={{ margin: 0 }}>
                  <FormItem top="Текст"><Textarea value={editReflectionText} onChange={(e) => setEditReflectionText(e.target.value)} /></FormItem>
                  <FormItem top="Публикация"><Input type="datetime-local" value={editReflectionPublishTime} onChange={(e) => setEditReflectionPublishTime(e.target.value)} /></FormItem>
                  <FormItem top="Закрытие"><Input type="datetime-local" value={editReflectionEndTime} onChange={(e) => setEditReflectionEndTime(e.target.value)} /></FormItem>
                  <FormItem top="Баллы"><Input type="number" value={editReflectionPoints} onChange={(e) => setEditReflectionPoints(e.target.value)} /></FormItem>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="m" onClick={() => void updateReflectionQuestion(r.id, {
                      text: editReflectionText,
                      publishTime: new Date(editReflectionPublishTime).toISOString(),
                      endTime: editReflectionEndTime ? new Date(editReflectionEndTime).toISOString() : null,
                      points: Number(editReflectionPoints) || 10,
                    }).then(() => { setEditingReflectionId(null); load(); })}>Сохранить</Button>
                    <Button size="m" mode="secondary" onClick={() => setEditingReflectionId(null)}>Отмена</Button>
                  </div>
                </div>
              ) : (
                <SimpleCell
                  multiline
                  subtitle={`${r.type} · ${new Date(r.publishTime).toLocaleString('ru-RU')} ${r.endTime ? ` - ${new Date(r.endTime).toLocaleString('ru-RU')}` : ''} · ${r.points} б.`}
                  after={
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button
                        size="s"
                        mode="outline"
                        onClick={() => {
                          setEditingReflectionId(r.id);
                          setEditReflectionText(r.text);
                          setEditReflectionPublishTime(new Date(r.publishTime).toISOString().slice(0, 16));
                          setEditReflectionEndTime(r.endTime ? new Date(r.endTime).toISOString().slice(0, 16) : '');
                          setEditReflectionPoints(String(r.points));
                        }}
                      >
                        Изм.
                      </Button>
                      <Button size="s" mode="outline" onClick={() => void deleteReflectionQuestion(r.id).then(load)}>
                        Удалить
                      </Button>
                    </div>
                  }
                >
                  {r.groupId ? <Badge mode="prominent" style={{ display: 'inline-block', marginRight: 8 }}>Группа {r.groupId}</Badge> : null}
                  {r.text}
                </SimpleCell>
              )}
            </Div>
          ))}
        </Group>
      ) : tab === 'push' ? (
        <Group header="Рассылка">
          <FormItem top="Текст сообщения">
            <Textarea value={pushText} onChange={(e) => setPushText(e.target.value)} />
          </FormItem>
          <FormItem top="Изображение (необязательно)">
            {pushImage ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={pushImage} alt="Превью" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                <Button 
                  mode="tertiary" 
                  size="s" 
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white' }}
                  onClick={() => setPushImage(null)}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <Button mode="secondary" loading={pushUploading} onClick={() => void handleUploadPushImage()}>
                📷 Прикрепить фото
              </Button>
            )}
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
          <Div>
            <Button
              size="l"
              stretched
              onClick={() => void sendAdminPush({
                text: pushText,
                image: pushImage || undefined,
                target_type: pushTarget,
                target_tracks: pushTarget === 'track' && pushTracks.length ? pushTracks : undefined,
                target_user_id: pushTarget === 'user' ? Number(pushUserId) : undefined,
                scheduled_at: pushScheduledAt ? new Date(pushScheduledAt).toISOString() : undefined,
              }).then(() => { 
                setPushText(''); 
                setPushImage(null); 
                setPushUserId('');
                setPushScheduledAt('');
                load();
              })}
            >
              Отправить
            </Button>
          </Div>
          
          <Group header="История рассылок">
            {broadcasts.map((b) => (
              <SimpleCell
                key={b.id}
                multiline
                subtitle={`${b.targetType} · ${b.scheduledAt ? `Запланировано: ${new Date(b.scheduledAt).toLocaleString('ru-RU')}` : `Отправлено: ${new Date(b.sentAt || b.createdAt).toLocaleString('ru-RU')}`}`}
              >
                {b.text}
              </SimpleCell>
            ))}
          </Group>
        </Group>
      ) : tab === 'diagnostics' ? (
        <Group header="Самодиагностика тренера">
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
          <Div>
            <Button size="m" onClick={() => void saveDiagnosticsSettings(diagTracks).then(load)}>
              Сохранить настройки
            </Button>
          </Div>

          <Div style={{ marginTop: 24 }}>
            <Button 
              size="l" 
              stretched 
              mode="secondary" 
              href={getDiagnosticsExportUrl()} 
              target="_blank"
            >
              Скачать результаты (CSV)
            </Button>
          </Div>

          <Group header="Последние результаты">
            {diagResults.slice(0, 50).map(r => (
              <SimpleCell
                key={r.id}
                multiline
                subtitle={`${new Date(r.createdAt).toLocaleString('ru-RU')} · Блок ${r.blockId} · Попытка ${r.attemptNumber}`}
                after={<div style={{ fontWeight: 600 }}>{r.score}/5</div>}
              >
                {r.user?.firstName} {r.user?.lastName} ({r.user?.track})
              </SimpleCell>
            ))}
            {diagResults.length === 0 && <Placeholder>Нет результатов</Placeholder>}
          </Group>
        </Group>
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
    </Panel>
  );
}
