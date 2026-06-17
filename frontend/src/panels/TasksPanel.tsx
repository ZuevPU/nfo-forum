import {
  Button,
  Div,
  Group,
  Spinner,
  PullToRefresh,
} from '@vkontakte/vkui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { pickImage } from '../lib/vk-bridge';
import { EmptyState } from '../components/EmptyState';
import { PanelLayout } from '../components/PanelLayout';
import { TaskSuccessBanner } from '../components/TaskSuccessBanner';
import { useLayout } from '../contexts/LayoutContext';
import {
  applyNetworkingTask,
  fetchDailyFocus,
  fetchTask,
  fetchTasks,
  submitTask,
  taskFromDetail,
  type DailyFocus,
  type TaskItem,
} from '../api/tasks';

function contactsRequired(task: TaskItem) {
  return task.contactsRequired ?? task.networkingContacts ?? 1;
}

function isMultiNetworking(task: TaskItem) {
  return !!task.isRandomDistribution && contactsRequired(task) > 1;
}

function NetworkingPartnersList({
  partners,
  title,
}: {
  partners?: TaskItem['partners'];
  title: string;
}) {
  if (!partners?.length) return null;
  return (
    <div style={{ marginTop: 12, padding: 10, background: '#f2f3f9', borderRadius: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {partners.map((p) => (
        <div key={p.id} style={{ marginBottom: 4 }}>
          {p.firstName} {p.lastName ?? ''}{p.track ? ` · ${p.track}` : ''}
        </div>
      ))}
    </div>
  );
}

function findTaskById(tasks: TaskItem[], id: number) {
  return tasks.find((t) => t.id === id || String(t.id) === String(id)) ?? null;
}

export function TasksPanel() {
  const { taskId } = useParams<{ taskId?: string }>();
  const navigate = useNavigate();
  const { setBackHandler, setTabbarHidden } = useLayout();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [focus, setFocus] = useState<DailyFocus | null>(null);
  const [viewTask, setViewTask] = useState<TaskItem | null>(null);
  const [answer, setAnswer] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [networkingLoading, setNetworkingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState<{ points?: number; pendingReview?: boolean } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const prevTaskIdRef = useRef(taskId);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchDailyFocus()])
      .then(([t, f]) => {
        setTasks(t.tasks);
        setFocus(f.focus);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const closeTaskDetail = useCallback(() => {
    setViewTask(null);
    setAnswer('');
    setPhotos([]);
    navigate('/tasks', { replace: true });
  }, [navigate]);

  const openTask = useCallback((task: TaskItem) => {
    setViewTask(task);
    setAnswer('');
    setPhotos([]);
    setUploadError(null);
    if (String(task.id) !== taskId) {
      navigate(`/tasks/${task.id}`);
    }
  }, [navigate, taskId]);

  useEffect(() => {
    if (prevTaskIdRef.current && !taskId) {
      setViewTask(null);
      setAnswer('');
      setPhotos([]);
    }
    prevTaskIdRef.current = taskId;

    if (!taskId) return;

    const id = Number(taskId);
    if (Number.isNaN(id)) {
      navigate('/tasks', { replace: true });
      return;
    }

    if (viewTask?.id === id) return;

    const fromList = findTaskById(tasks, id);
    if (fromList) {
      setViewTask(fromList);
      return;
    }

    if (loading) return;

    let cancelled = false;
    setDetailLoading(true);
    fetchTask(id)
      .then((data) => {
        if (!cancelled) setViewTask(taskFromDetail(data));
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) navigate('/tasks', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskId, tasks, loading, viewTask?.id, navigate]);

  useEffect(() => {
    if (!taskSuccess) return;
    const timer = window.setTimeout(() => setTaskSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [taskSuccess]);

  useEffect(() => {
    setTabbarHidden(viewTask != null);
    return () => setTabbarHidden(false);
  }, [viewTask, setTabbarHidden]);

  useEffect(() => {
    if (!viewTask) {
      setBackHandler(null);
      return;
    }
    setBackHandler(() => {
      closeTaskDetail();
      return true;
    });
    return () => setBackHandler(null);
  }, [viewTask, setBackHandler, closeTaskDetail]);

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
      if (viewTask?.id === task.id) {
        const updated = await fetchTasks();
        const fresh = findTaskById(updated.tasks, task.id);
        if (fresh) setViewTask(fresh);
        setTasks(updated.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNetworkingLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!viewTask) return;
    if (viewTask.requiresPhoto && photos.length === 0) {
      alert('Для этого задания необходимо прикрепить фото');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitTask(viewTask.id, answer, photos.length ? photos : undefined);
      const status = result.submission?.status;
      setTaskSuccess({
        points: status === 'approved' ? viewTask.points : undefined,
        pendingReview: status === 'pending',
      });
      closeTaskDetail();
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

  const renderTaskDetail = (task: TaskItem) => {
    const blockedNetworking =
      task.isRandomDistribution &&
      task.networkingStatus !== 'paired' &&
      task.status !== 'approved';

    if (blockedNetworking) {
      return (
        <Group>
          <Div style={{ padding: '12px 16px' }}>
            <div className="nfo-card" style={{ margin: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{task.title}</div>
              <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4, lineHeight: 1.4 }}>
                {task.description}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#f39c12', lineHeight: 1.45 }}>
                {!task.networkingStatus
                  ? isMultiNetworking(task)
                    ? `Подай заявку — назначим ${contactsRequired(task)} участников для знакомства.`
                    : 'Сначала подай заявку на нетворкинг — после назначения партнёра откроется форма задания.'
                  : isMultiNetworking(task)
                    ? `Назначено ${task.partners?.length ?? 0} из ${contactsRequired(task)}. «Выполнить» откроется, когда все будут готовы.`
                    : 'Ожидаем партнёра. Как только пара будет готова, нажми «Выполнить» в списке заданий.'}
              </div>
              {task.partners && task.partners.length > 0 && (
                <NetworkingPartnersList
                  partners={task.partners}
                  title={isMultiNetworking(task) ? 'Участники для знакомства:' : 'Твой партнёр:'}
                />
              )}
              {!task.networkingStatus && (
                <Button
                  size="m"
                  mode="primary"
                  style={{ marginTop: 12 }}
                  loading={networkingLoading}
                  onClick={() => void handleApplyNetworking(task)}
                >
                  {isMultiNetworking(task) ? 'Получить участников' : 'Подать заявку на нетворкинг'}
                </Button>
              )}
            </div>
          </Div>
          <Div style={{ padding: '0 16px 16px' }}>
            <Button size="l" mode="outline" stretched onClick={closeTaskDetail}>Назад к списку</Button>
          </Div>
        </Group>
      );
    }

    return (
      <Group>
        <Div style={{ padding: '12px 16px' }}>
          <div className="nfo-card" style={{ margin: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{task.title}</div>
            <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4, lineHeight: 1.4 }}>{task.description}</div>
            {task.isRandomDistribution && (task.partners?.length || task.partner) && (
              <NetworkingPartnersList
                partners={task.partners?.length ? task.partners : task.partner ? [task.partner] : []}
                title={isMultiNetworking(task) ? 'Участники для знакомства:' : 'Твой партнёр:'}
              />
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
        <Div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
          <Button size="l" mode="primary" stretched loading={submitting} onClick={() => void handleSubmit()}>Отправить</Button>
          <Button size="l" mode="outline" onClick={closeTaskDetail}>Назад</Button>
        </Div>
      </Group>
    );
  };

  const renderTaskList = () => (
    <PullToRefresh onRefresh={() => load()} isFetching={loading}>
      {tasks.length === 0 ? (
        <EmptyState message="Задания скоро появятся — следи за уведомлениями" />
      ) : (
        <Group>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
            {tasks.map((t) => {
              const canOpen =
                t.status !== 'approved' &&
                (!t.isRandomDistribution || t.networkingStatus === 'paired');
              const needsNetworking = t.isRandomDistribution && !t.networkingStatus;
              const waitingNetworking = t.isRandomDistribution && t.networkingStatus === 'waiting';

              return (
                <div
                  key={t.id}
                  className="nfo-card"
                  style={{ margin: 0, opacity: t.status === 'approved' ? 0.6 : 1 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vkui--color_text_primary)' }}>{t.title}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)' }}>{t.points} б.</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4, lineHeight: 1.4 }}>
                    {t.description}
                  </div>
                  {t.isRandomDistribution && (
                    <div style={{ marginTop: 8 }}>
                      {needsNetworking && (
                        <>
                          <div style={{ fontSize: 11, color: '#f39c12', marginBottom: 6 }}>
                            {isMultiNetworking(t)
                              ? `Подай заявку — назначим ${contactsRequired(t)} участников`
                              : 'Сначала подай заявку на нетворкинг'}
                          </div>
                          <Button size="s" mode="primary" loading={networkingLoading} onClick={() => void handleApplyNetworking(t)}>
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
      )}
    </PullToRefresh>
  );

  return (
    <PanelLayout id="tasks" title="Активные задания" subtitle="Задания дня" useGradient backToHome>
      {taskSuccess && <TaskSuccessBanner points={taskSuccess.points} pendingReview={taskSuccess.pendingReview} />}
      {focus && !viewTask && (
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
      {loading && !viewTask ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></Div>
      ) : detailLoading && !viewTask ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></Div>
      ) : viewTask ? (
        renderTaskDetail(viewTask)
      ) : (
        renderTaskList()
      )}
    </PanelLayout>
  );
}
