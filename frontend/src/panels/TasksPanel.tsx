import {
  Button,
  Div,
  Group,
  Spinner,
} from '@vkontakte/vkui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { pickImage } from '../lib/vk-bridge';
import { EmptyState } from '../components/EmptyState';
import { PanelLayout } from '../components/PanelLayout';
import { NotificationBell } from '../components/NotificationBell';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskSuccessBanner } from '../components/TaskSuccessBanner';
import { useLayout } from '../contexts/LayoutContext';
import {
  applyNetworkingTask,
  applyNetworkingLunch,
  fetchDailyFocus,
  fetchTasks,
  submitTask,
  type DailyFocus,
  type TaskItem,
} from '../api/tasks';

const MODAL_CLOSE_SUPPRESS_MS = 400;

function contactsRequired(task: TaskItem) {
  return task.contactsRequired ?? task.networkingContacts ?? 1;
}

function isMultiNetworking(task: TaskItem) {
  return !!task.isRandomDistribution && contactsRequired(task) > 1;
}

function findTaskById(tasks: TaskItem[], id: number) {
  return tasks.find((t) => Number(t.id) === id) ?? null;
}

function stopTouchPropagation(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

export function TasksPanel() {
  const { taskId } = useParams<{ taskId?: string }>();
  const navigate = useNavigate();
  const { setBackHandler } = useLayout();
  const suppressCloseUntilRef = useRef(0);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [focus, setFocus] = useState<DailyFocus | null>(null);
  const [modalTask, setModalTask] = useState<TaskItem | null>(null);
  const [answer, setAnswer] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkingLoading, setNetworkingLoading] = useState(false);
  const [lunchLoading, setLunchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState<{ points?: number; pendingReview?: boolean } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const beginModalOpen = useCallback(() => {
    suppressCloseUntilRef.current = performance.now() + MODAL_CLOSE_SUPPRESS_MS;
  }, []);

  const load = useCallback((silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    Promise.all([fetchTasks(), fetchDailyFocus()])
      .then(([t, f]) => {
        setTasks(t.tasks);
        setFocus(f.focus);
      })
      .catch(console.error)
      .finally(() => {
        if (silent) setRefreshing(false);
        else setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetModalForm = useCallback(() => {
    setAnswer('');
    setPhotos([]);
    setUploadError(null);
  }, []);

  const closeTaskModal = useCallback(() => {
    if (performance.now() < suppressCloseUntilRef.current) return;
    setModalTask(null);
    resetModalForm();
    if (taskId) navigate('/tasks', { replace: true });
  }, [navigate, resetModalForm, taskId]);

  const openTask = useCallback((task: TaskItem) => {
    beginModalOpen();
    setModalTask(task);
    resetModalForm();
  }, [beginModalOpen, resetModalForm]);

  // Deep link: /tasks/:id — подсветка в списке (без авто-открытия модалки)
  useEffect(() => {
    if (!taskId || loading) return;
    const el = document.getElementById(`task-${taskId}`);
    if (!el) return;

    const frame = window.requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'center' });
      el.style.outline = '2px solid var(--nfo-primary)';
      el.style.borderRadius = '12px';
    });

    return () => {
      window.cancelAnimationFrame(frame);
      el.style.outline = '';
      el.style.borderRadius = '';
    };
  }, [taskId, loading, tasks]);

  useEffect(() => {
    if (!taskSuccess) return;
    const timer = window.setTimeout(() => setTaskSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [taskSuccess]);

  useEffect(() => {
    if (!modalTask) {
      setBackHandler(null);
      return;
    }
    setBackHandler(() => {
      closeTaskModal();
      return true;
    });
    return () => setBackHandler(null);
  }, [modalTask, setBackHandler, closeTaskModal]);

  const handleUploadPhoto = async () => {
    if (photos.length >= 3) return;
    setUploading(true);
    setUploadError(null);
    try {
      const picked = await pickImage();
      if (picked) {
        setPhotos((prev) => [...prev, picked.path ?? picked.url].slice(0, 3));
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
      const updated = await fetchTasks();
      setTasks(updated.tasks);
      const fresh = findTaskById(updated.tasks, task.id);
      if (fresh) setModalTask((prev) => (prev?.id === task.id ? fresh : prev));
    } catch (e) {
      console.error(e);
    } finally {
      setNetworkingLoading(false);
    }
  };

  const handleApplyLunch = async (task: TaskItem) => {
    setLunchLoading(true);
    try {
      await applyNetworkingLunch();
      const updated = await fetchTasks();
      setTasks(updated.tasks);
      const fresh = findTaskById(updated.tasks, task.id);
      if (fresh) setModalTask((prev) => (prev?.id === task.id ? fresh : prev));
    } catch (e) {
      console.error(e);
      alert('Не удалось принять участие. Попробуй ещё раз.');
    } finally {
      setLunchLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!modalTask) return;
    const photoMode = modalTask.photoMode ?? (modalTask.requiresPhoto ? 'required' : 'none');
    if (photoMode === 'required' && photos.length === 0) {
      alert('Для этого задания необходимо прикрепить фото');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitTask(modalTask.id, answer, photos.length ? photos : undefined);
      const status = result.submission?.status;
      setTaskSuccess({
        points: status === 'approved' ? modalTask.points : undefined,
        pendingReview: status === 'pending',
      });
      suppressCloseUntilRef.current = 0;
      closeTaskModal();
      load(true);
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

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        className="nfo-tasks-refresh-btn"
        disabled={refreshing || loading}
        onClick={() => load(true)}
      >
        {refreshing ? '…' : '↻'}
      </button>
      <NotificationBell />
    </div>
  );

  const renderTaskList = () => {
    if (tasks.length === 0) {
      return <EmptyState message="Задания скоро появятся — следи за уведомлениями" />;
    }

    return (
      <Group>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          {tasks.map((t) => {
            const canOpen = t.status !== 'approved';
            const needsNetworking = t.isRandomDistribution && !t.networkingStatus;
            const waitingNetworking = t.isRandomDistribution && t.networkingStatus === 'waiting';

            return (
              <div
                key={t.id}
                id={`task-${t.id}`}
                className="nfo-card"
                style={{ margin: 0, opacity: t.status === 'approved' ? 0.6 : 1, touchAction: 'manipulation' }}
                onPointerDown={stopTouchPropagation}
                onTouchStart={stopTouchPropagation}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vkui--color_text_primary)' }}>{t.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)' }}>{t.points} б.</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4, lineHeight: 1.4 }}>
                  {t.description}
                </div>
                {t.isNetworkingLunch && (
                  <div style={{ marginTop: 8 }}>
                    {t.lunchTableNumber ? (
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#27ae60' }}>
                        Ваш стол: № {t.lunchTableNumber}
                      </div>
                    ) : t.lunchApplied ? (
                      <div style={{ fontSize: 11, color: '#f39c12' }}>
                        Заявка принята. Состав столов объявят позже.
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: '#f39c12', marginBottom: 6 }}>
                          Подтверди участие в нетворкинг-обеде
                        </div>
                        <Button
                          size="s"
                          mode="primary"
                          loading={lunchLoading}
                          onPointerDown={stopTouchPropagation}
                          onTouchStart={stopTouchPropagation}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleApplyLunch(t);
                          }}
                        >
                          Принять участие
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {t.isRandomDistribution && !t.isNetworkingLunch && (
                  <div style={{ marginTop: 8 }}>
                    {needsNetworking && (
                      <>
                        <div style={{ fontSize: 11, color: '#f39c12', marginBottom: 6 }}>
                          {isMultiNetworking(t)
                            ? `Подай заявку — назначим ${contactsRequired(t)} участников`
                            : 'Сначала подай заявку на нетворкинг'}
                        </div>
                        <Button
                          size="s"
                          mode="primary"
                          loading={networkingLoading}
                          onPointerDown={stopTouchPropagation}
                          onTouchStart={stopTouchPropagation}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleApplyNetworking(t);
                          }}
                        >
                          {isMultiNetworking(t) ? 'Получить участников' : 'Подать заявку на нетворкинг'}
                        </Button>
                      </>
                    )}
                    {waitingNetworking && (
                      <div style={{ fontSize: 11, color: '#f39c12' }}>
                        {isMultiNetworking(t)
                          ? `Назначено ${t.partners?.length ?? 0}/${contactsRequired(t)} — «Выполнить» откроется после полного списка`
                          : 'Ожидаем партнёра — «Выполнить» откроется после назначения пары'}
                      </div>
                    )}
                    {t.networkingStatus === 'paired' && (t.partners?.length || t.partner) && (
                      <div style={{ fontSize: 11, color: '#27ae60' }}>
                        {isMultiNetworking(t)
                          ? `Участники: ${(t.partners ?? (t.partner ? [t.partner] : [])).map((p) => p.firstName).join(', ')}`
                          : `Партнёр: ${t.partner?.firstName} ${t.partner?.lastName ?? ''}`}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {statusBadge(t.status)}
                  {t.deadline && (
                    <div style={{ fontSize: 11, color: t.isPastDeadline ? '#e74c3c' : 'var(--vkui--color_text_secondary)' }}>
                      До {new Date(t.deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {canOpen && (
                    <Button
                      size="s"
                      mode="primary"
                      type="button"
                      onPointerDown={stopTouchPropagation}
                      onTouchStart={stopTouchPropagation}
                      onClick={(e) => {
                        e.stopPropagation();
                        openTask(t);
                      }}
                    >
                      Выполнить
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </Div>
      </Group>
    );
  };

  return (
    <>
      <PanelLayout
        id="tasks"
        title="Активные задания"
        subtitle="Задания дня"
        useGradient
        backToHome
        headerActions={headerActions}
      >
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
          <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size="l" />
          </Div>
        ) : (
          renderTaskList()
        )}
      </PanelLayout>

      <TaskDetailModal
        task={modalTask}
        loading={false}
        answer={answer}
        photos={photos}
        uploading={uploading}
        submitting={submitting}
        networkingLoading={networkingLoading}
        uploadError={uploadError}
        onClose={closeTaskModal}
        onAnswerChange={setAnswer}
        onUploadPhoto={() => void handleUploadPhoto()}
        onSubmit={() => void handleSubmit()}
        onApplyNetworking={(task) => void handleApplyNetworking(task)}
      />
    </>
  );
}
