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
  fetchAdminEvents,
  fetchAdminTasks,
  fetchPendingExchange,
  fetchPendingSubmissions,
  fetchReflectionQuestions,
  moderateExchange,
  moderateSubmission,
  sendAdminPush,
  updateAdminEvent,
  updateAdminTask,
  type AdminEvent,
  type AdminTask,
  type PendingQuestion,
  type PendingSubmission,
  type ReflectionQuestion,
} from '../api/admin';
import { PanelTitle } from '../components/PanelTitle';
import { TRACKS } from '../constants/tracks';
import { useAuthContext } from '../contexts/AuthContext';
import { uploadFiles } from '../lib/vk-bridge';

type Tab = 'events' | 'tasks' | 'exchange' | 'submissions' | 'reflection' | 'push';

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

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventTrack, setNewEventTrack] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDesc, setEditEventDesc] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('20');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPoints, setEditTaskPoints] = useState('20');

  const [newReflectionText, setNewReflectionText] = useState('');
  const [newReflectionType, setNewReflectionType] = useState('evening');

  const [pushText, setPushText] = useState('');
  const [pushImage, setPushImage] = useState<string | null>(null);
  const [pushUploading, setPushUploading] = useState(false);
  const [pushTarget, setPushTarget] = useState<'all' | 'track' | 'user'>('all');
  const [pushTrack, setPushTrack] = useState<string>(TRACKS[0]);

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
    ])
      .then(([e, t, q, s, r]) => {
        setEvents(e.events);
        setTasks(t.tasks);
        setQuestions(q.questions);
        setSubmissions(s.submissions);
        setReflections(r.questions);
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
              { label: 'Рефлексия', value: 'reflection' },
              { label: 'Push', value: 'push' },
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
          <FormItem top="Трек">
            <NativeSelect value={newEventTrack} onChange={(e) => setNewEventTrack(e.target.value)}>
              <option value="">Все</option>
              {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </FormItem>
          <Div>
            <Button
              size="m"
              onClick={() => void createAdminEvent({
                title: newEventTitle,
                description: newEventDesc || undefined,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                track: newEventTrack || null,
              }).then(() => { setNewEventTitle(''); setNewEventDesc(''); load(); })}
            >
              Добавить
            </Button>
          </Div>
          {events.map((ev) => (
            <SimpleCell
              key={ev.id}
              multiline
              subtitle={new Date(ev.startTime).toLocaleString('ru-RU')}
              after={
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button
                    size="s"
                    mode="outline"
                    onClick={() => {
                      setEditingEventId(ev.id);
                      setEditEventTitle(ev.title);
                      setEditEventDesc(ev.description ?? '');
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
                  <Input value={editEventTitle} onChange={(e) => setEditEventTitle(e.target.value)} />
                  <Textarea value={editEventDesc} onChange={(e) => setEditEventDesc(e.target.value)} />
                  <Button
                    size="s"
                    onClick={() => void updateAdminEvent(ev.id, {
                      title: editEventTitle,
                      description: editEventDesc,
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
          <Div>
            <Button
              size="m"
              onClick={() => void createAdminTask({
                title: newTaskTitle,
                description: newTaskDesc || newTaskTitle,
                points: Number(newTaskPoints) || 20,
              }).then(() => { setNewTaskTitle(''); setNewTaskDesc(''); load(); })}
            >
              Добавить
            </Button>
          </Div>
          {tasks.map((t) => (
            <SimpleCell
              key={t.id}
              multiline
              subtitle={`${t.points} б.`}
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
                  <Input value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} />
                  <Textarea value={editTaskDesc} onChange={(e) => setEditTaskDesc(e.target.value)} />
                  <Input type="number" value={editTaskPoints} onChange={(e) => setEditTaskPoints(e.target.value)} />
                  <Button
                    size="s"
                    onClick={() => void updateAdminTask(t.id, {
                      title: editTaskTitle,
                      description: editTaskDesc,
                      points: Number(editTaskPoints) || 20,
                    }).then(() => { setEditingTaskId(null); load(); })}
                  >
                    Сохранить
                  </Button>
                </div>
              ) : t.title}
            </SimpleCell>
          ))}
        </Group>
      ) : tab === 'exchange' ? (
        <Group header="Модерация вопросов">
          {questions.length === 0 ? (
            <Placeholder>Нет вопросов на модерации</Placeholder>
          ) : (
            questions.map((q) => (
              <SimpleCell
                key={q.id}
                multiline
                after={
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button size="s" onClick={() => void moderateExchange(q.id, 'approved').then(load)}>✓</Button>
                    <Button size="s" mode="outline" onClick={() => void moderateExchange(q.id, 'rejected').then(load)}>✕</Button>
                  </div>
                }
              >
                {q.text}
              </SimpleCell>
            ))
          )}
        </Group>
      ) : tab === 'submissions' ? (
        <Group header="Модерация заданий">
          {submissions.length === 0 ? (
            <Placeholder>Нет ответов на проверке</Placeholder>
          ) : (
            submissions.map((s) => (
              <SimpleCell
                key={s.id}
                multiline
                subtitle={s.answerText ?? undefined}
                after={
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button size="s" onClick={() => void moderateSubmission(s.id, 'approved').then(load)}>✓</Button>
                    <Button size="s" mode="outline" onClick={() => void moderateSubmission(s.id, 'rejected').then(load)}>✕</Button>
                  </div>
                }
              >
                Задание #{s.taskId}
              </SimpleCell>
            ))
          )}
        </Group>
      ) : tab === 'reflection' ? (
        <Group header="Вопросы рефлексии">
          <FormItem top="Текст вопроса">
            <Textarea value={newReflectionText} onChange={(e) => setNewReflectionText(e.target.value)} />
          </FormItem>
          <FormItem top="Тип">
            <NativeSelect value={newReflectionType} onChange={(e) => setNewReflectionType(e.target.value)}>
              <option value="evening">Вечерний</option>
              <option value="track">Трек</option>
            </NativeSelect>
          </FormItem>
          <Div>
            <Button
              size="m"
              onClick={() => void createReflectionQuestion({
                text: newReflectionText,
                type: newReflectionType,
                publishTime: new Date().toISOString(),
              }).then(() => { setNewReflectionText(''); load(); })}
            >
              Добавить
            </Button>
          </Div>
          {reflections.map((r) => (
            <SimpleCell
              key={r.id}
              multiline
              subtitle={`${r.type} · ${new Date(r.publishTime).toLocaleString('ru-RU')}`}
              after={
                <Button size="s" mode="outline" onClick={() => void deleteReflectionQuestion(r.id).then(load)}>
                  Удалить
                </Button>
              }
            >
              {r.text}
            </SimpleCell>
          ))}
        </Group>
      ) : (
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
            </NativeSelect>
          </FormItem>
          {pushTarget === 'track' && (
            <FormItem top="Трек">
              <NativeSelect value={pushTrack} onChange={(e) => setPushTrack(e.target.value)}>
                {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
              </NativeSelect>
            </FormItem>
          )}
          <Div>
            <Button
              size="l"
              stretched
              onClick={() => void sendAdminPush({
                text: pushText,
                image: pushImage || undefined,
                target_type: pushTarget,
                target_tracks: pushTarget === 'track' ? [pushTrack] : undefined,
              }).then(() => { setPushText(''); setPushImage(null); })}
            >
              Отправить
            </Button>
          </Div>
        </Group>
      )}
    </Panel>
  );
}
