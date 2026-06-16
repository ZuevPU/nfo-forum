import {
  Button,
  Div,
  Group,
  Headline,
  Panel,
  PanelHeader,
  Spinner,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { PanelTitle } from '../components/PanelTitle';
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

  const handleUploadPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
        setUploading(false);
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;
    if (selectedTask.requiresPhoto && photos.length === 0) {
      alert('Для этого задания необходимо прикрепить фото');
      return;
    }
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
    if (status === 'new') return <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: 'var(--nfo-primary)', color: '#fff', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Новое</div>;
    if (status === 'pending') return <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: '#f39c12', color: '#fff', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>На проверке</div>;
    if (status === 'approved') return <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: '#27ae60', color: '#fff', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Выполнено</div>;
    if (status === 'rejected') return <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: '#e74c3c', color: '#fff', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>Отклонено</div>;
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
          <Div style={{ padding: '12px 16px' }}>
            <div className="nfo-card" style={{ margin: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedTask.title}</div>
              <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4, lineHeight: 1.4 }}>{selectedTask.description}</div>
            </div>
          </Div>
          <Div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>Твой ответ</div>
            <textarea
              className="nfo-input"
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </Div>
          <Div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px 12px' }}>
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
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          {tasks.map((t) => (
            <div key={t.id} className="nfo-card" style={{ margin: 0, opacity: t.status === 'approved' ? 0.6 : 1 }} onClick={() => t.status !== 'approved' && setSelectedTask(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vkui--color_text_primary)' }}>{t.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)' }}>{t.points} б.</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4, lineHeight: 1.4 }}>
                {t.description}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                {statusBadge(t.status)}
                {t.deadline && (
                  <div style={{ fontSize: 11, color: t.isPastDeadline ? '#e74c3c' : '#888' }}>
                    До {new Date(t.deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          </Div>
        </Group>
      )}
    </Panel>
  );
}
