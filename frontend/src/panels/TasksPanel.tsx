import {
  Badge,
  Button,
  Div,
  FormItem,
  Group,
  Headline,
  Panel,
  PanelHeader,
  SimpleCell,
  Spinner,
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { PanelTitle } from '../components/PanelTitle';
import { uploadFiles } from '../lib/vk-bridge';
import {
  fetchDailyFocus,
  fetchTasks,
  submitTask,
  type DailyFocus,
  type TaskItem,
} from '../api/tasks';

export function TasksPanel() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [focus, setFocus] = useState<DailyFocus | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [answer, setAnswer] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    Promise.all([fetchTasks(), fetchDailyFocus()])
      .then(([t, f]) => {
        setTasks(t.tasks);
        setFocus(f.focus);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUploadPhoto = async () => {
    setUploading(true);
    try {
      const urls = await uploadFiles(1);
      setPhotos((prev) => [...prev, ...urls]);
    } catch (e) {
      console.error('Photo upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await submitTask(selectedTask.id, answer, photos.length ? photos : undefined);
      setSelectedTask(null);
      setAnswer('');
      setPhotos([]);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'new') return <Badge mode="prominent">новое</Badge>;
    if (status === 'pending') return <Badge mode="new">на проверке</Badge>;
    if (status === 'approved') return <Badge mode="prominent">выполнено</Badge>;
    return null;
  };

  return (
    <Panel id="tasks">
      <PanelHeader><PanelTitle title="Задания" subtitle="Задания дня" /></PanelHeader>
      {focus && (
        <Group>
          <Div className="nfo-gradient-green" style={{ borderRadius: 12, margin: 12, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>Фокус дня</div>
            <Headline level="2" weight="2" style={{ color: '#fff', marginTop: 4 }}>{focus.title}</Headline>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{focus.description}</div>
          </Div>
        </Group>
      )}
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></Div>
      ) : selectedTask ? (
        <Group>
          <SimpleCell subtitle={selectedTask.description} multiline>{selectedTask.title}</SimpleCell>
          <FormItem top="Твой ответ">
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </FormItem>
          <Div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="m" mode="secondary" loading={uploading} onClick={() => void handleUploadPhoto()}>
              📷 Добавить фото
            </Button>
            {photos.map((url, i) => (
              <img key={url} src={url} alt={`Фото ${i + 1}`} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
            ))}
          </Div>
          <Div style={{ display: 'flex', gap: 8 }}>
            <Button size="l" stretched loading={submitting} onClick={() => void handleSubmit()}>Отправить</Button>
            <Button size="l" mode="secondary" onClick={() => { setSelectedTask(null); setPhotos([]); }}>Назад</Button>
          </Div>
        </Group>
      ) : (
        <Group>
          {tasks.map((t) => (
            <SimpleCell
              key={t.id}
              subtitle={t.description}
              after={statusBadge(t.status)}
              onClick={() => t.status !== 'approved' && setSelectedTask(t)}
              multiline
            >
              {t.title} · {t.points} б.
            </SimpleCell>
          ))}
        </Group>
      )}
    </Panel>
  );
}
