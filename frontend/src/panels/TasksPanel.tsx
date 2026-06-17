import {
  Button,
  Div,
  Group,
  Spinner,
  PullToRefresh,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pickImage } from '../lib/vk-bridge';
import { EmptyState } from '../components/EmptyState';
import { PanelLayout } from '../components/PanelLayout';
import { TaskSuccessBanner } from '../components/TaskSuccessBanner';
import { useLayout } from '../contexts/LayoutContext';
import {
  applyNetworkingTask,
  fetchDailyFocus,
  fetchTasks,
  submitTask,
  type DailyFocus,
  type TaskItem,
} from '../api/tasks';

export function TasksPanel() {
  const { taskId } = useParams<{ taskId?: string }>();
  const { setBackHandler } = useLayout();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [focus, setFocus] = useState<DailyFocus | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [answer, setAnswer] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [networkingLoading, setNetworkingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState<{ points?: number; pendingReview?: boolean } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!taskId || tasks.length === 0 || selectedTask) return;
    const id = Number(taskId);
    if (Number.isNaN(id)) return;
    const task = tasks.find((t) => t.id === id);
    if (task) setSelectedTask(task);
  }, [taskId, tasks, selectedTask]);

  useEffect(() => {
    if (!taskSuccess) return;
    const timer = window.setTimeout(() => setTaskSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [taskSuccess]);

  useEffect(() => {
    if (!selectedTask) {
      setBackHandler(null);
      return;
    }
    setBackHandler(() => {
      setSelectedTask(null);
      setAnswer('');
      setPhotos([]);
      return true;
    });
    return () => setBackHandler(null);
  }, [selectedTask, setBackHandler]);

  const handleUploadPhoto = async () => {
    if (photos.length >= 3) return;
    setUploading(true);
    setUploadError(null);
    try {
      const picked = await pickImage();
      if (picked) {
        setPhotos((prev) => [...prev, picked.url].slice(0, 3));
      } else {
        setUploadError('Не удалось выбрать фото. Попробуй JPG или PNG до 10 МБ.');
      }
    } catch (e) {
      console.error('Upload failed:', e);
      setUploadError('Не удалось прикрепить фото.');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyNetworking = async (task: TaskItem) => {
    setNetworkingLoading(true);
    try {
      await applyNetworkingTask(task.id);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setNetworkingLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;
    if (selectedTask.requiresPhoto && photos.length === 0) {
      alert('Для этого задания необходимо прикрепить фото');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitTask(selectedTask.id, answer, photos.length ? photos : undefined);
      const status = result.submission?.status;
      setTaskSuccess({
        points: status === 'approved' ? selectedTask.points : undefined,
        pendingReview: status === 'pending',
      });
      setSelectedTask(null);
      setAnswer('');
      setPhotos([]);
      load();
    } catch (e) {
      console.error(e);
      alert('Не удалось отправить задание. Попробуй ещё раз.');
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
    <PanelLayout id="tasks" title="Активные задания" subtitle="Задания дня" useGradient backToHome>
      <PullToRefresh onRefresh={() => load()} isFetching={loading}>
      {taskSuccess && <TaskSuccessBanner points={taskSuccess.points} pendingReview={taskSuccess.pendingReview} />}
      {focus && (
        <Group>
          <Div style={{ margin: 12 }}>
            <div className="nfo-focus-day" style={{ cursor: 'default' }}>
              <div className="nfo-focus-day__label">Фокус дня</div>
              <div className="nfo-focus-day__title">{focus.title}</div>
              {focus.description && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 6, lineHeight: 1.4 }}>{focus.description}</div>
              )}
            </div>
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
              {selectedTask.isRandomDistribution && selectedTask.partner && (
                <div style={{ marginTop: 12, padding: 10, background: '#f2f3f9', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Твой партнёр:</div>
                  {selectedTask.partner.firstName} {selectedTask.partner.lastName ?? ''}
                  {selectedTask.partner.track ? ` · ${selectedTask.partner.track}` : ''}
                </div>
              )}
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
            <Button size="m" mode="secondary" loading={uploading} disabled={photos.length >= 3} onClick={() => void handleUploadPhoto()}>
              📷 Добавить фото ({photos.length}/3)
            </Button>
            {photos.map((url, i) => (
              <img key={`${i}-${url.slice(0, 32)}`} src={url} alt={`Фото ${i + 1}`} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
            ))}
          </Div>
          {uploadError && (
            <Div style={{ padding: '0 16px 12px', fontSize: 12, color: '#e74c3c' }}>{uploadError}</Div>
          )}
          <Div style={{ display: 'flex', gap: 8 }}>
            <Button size="l" stretched loading={submitting} onClick={() => void handleSubmit()}>Отправить</Button>
            <Button size="l" mode="secondary" onClick={() => { setSelectedTask(null); setPhotos([]); setAnswer(''); }}>Назад</Button>
          </Div>
        </Group>
      ) : tasks.length === 0 ? (
        <EmptyState message="Задания скоро появятся — следи за уведомлениями" />
      ) : (
        <Group>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          {tasks.map((t) => (
            <div key={t.id} className="nfo-card" style={{ margin: 0, opacity: t.status === 'approved' ? 0.6 : 1 }} onClick={() => {
              if (t.status === 'approved') return;
              if (t.isRandomDistribution && !t.networkingStatus) return;
              setSelectedTask(t);
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vkui--color_text_primary)' }}>{t.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)' }}>{t.points} б.</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4, lineHeight: 1.4 }}>
                {t.description}
              </div>
              {t.isRandomDistribution && (
                <div style={{ marginTop: 8 }}>
                  {!t.networkingStatus && (
                    <Button size="s" loading={networkingLoading} onClick={(e) => { e.stopPropagation(); void handleApplyNetworking(t); }}>
                      Подать заявку на нетворкинг
                    </Button>
                  )}
                  {t.networkingStatus === 'waiting' && (
                    <div style={{ fontSize: 11, color: '#f39c12' }}>Ожидаем партнёра...</div>
                  )}
                  {t.networkingStatus === 'paired' && t.partner && (
                    <div style={{ fontSize: 11, color: '#27ae60' }}>
                      Партнёр: {t.partner.firstName} {t.partner.lastName ?? ''}
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                {statusBadge(t.status)}
                {t.deadline && (
                  <div style={{ fontSize: 11, color: t.isPastDeadline ? '#e74c3c' : 'var(--vkui--color_text_secondary)' }}>
                    До {new Date(t.deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          </Div>
        </Group>
      )}
      </PullToRefresh>
    </PanelLayout>
  );
}
