import {
  Div,
  Group,
  Headline,
  Panel,
  PanelHeader,
  Spinner,
  Text,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormItem,
  Textarea,
  Button,
  Spacing,
  Switch,
  SimpleCell,
  PullToRefresh,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHome, submitFeedback, type HomeData } from '../api/home';
import { fetchReflectionLevel } from '../api/rating';
import { updateNotifications, updateNotificationPrefs, updateMessagesPermission } from '../api/auth';
import type { NotificationPrefs } from '../types/auth';
import { CurrentBlockCard } from '../components/CurrentBlockCard';
import { ActivityIcon } from '../components/ActivityIcon';
import { GradientHeader } from '../components/GradientHeader';
import { ProgressBar } from '../components/ProgressBar';
import { UserProfileCard } from '../components/UserProfileCard';
import { CommunityMessagesBanner } from '../components/CommunityMessagesBanner';
import { useAuthContext } from '../contexts/AuthContext';
import { requestVkMessagesFromGroup } from '../lib/vk-bridge';
import { FORUM_DAYS } from '../constants/nfoFactors';
import { DEFAULT_REFLECTION_THRESHOLDS, getReflectionProgress } from '../constants/reflectionLevels';

function getProgramDayInfo() {
  const mskDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
  const dateObj = new Date(`${mskDate}T12:00:00+03:00`);
  const dateStr = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  }).format(dateObj);

  const dayIndex = FORUM_DAYS.findIndex((d) => d.key === mskDate);
  const programDay = dayIndex >= 0 ? dayIndex + 1 : null;

  return { dateStr, programDay };
}

export function HomePanel() {
  const navigate = useNavigate();
  const { user, deleteUserAccount, refreshUser } = useAuthContext();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    user?.notificationPrefs ?? {
      program: true,
      questions: true,
      tasks: true,
      exchange: true,
      points: true,
    },
  );
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [reflectionThresholds, setReflectionThresholds] = useState<number[]>(DEFAULT_REFLECTION_THRESHOLDS);

  const load = () => {
    setLoading(true);
    fetchHome()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetchReflectionLevel()
      .then((data) => {
        if (data.thresholds?.length) setReflectionThresholds(data.thresholds);
      })
      .catch(console.error);
  }, []);

  if (loading || !user) {
    return (
      <Panel id="home">
        <PanelHeader>Главная</PanelHeader>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      </Panel>
    );
  }

  const event = data?.currentEvent ?? null;
  const { dateStr, programDay } = getProgramDayInfo();

  const { progress: reflectionProgress, pointsToNextLevel, nextLevel } = getReflectionProgress(
    user.reflectionLevel,
    user.reflectionPoints,
    reflectionThresholds,
  );

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSubmitting(true);
    try {
      await submitFeedback(feedbackText.trim());
      setFeedbackText('');
      setActiveModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Вы уверены, что хотите удалить свой аккаунт и все данные? Это действие необратимо.')) {
      await deleteUserAccount();
    }
  };

  const handleToggleNotifications = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setNotificationsEnabled(val);
    setNotificationsLoading(true);
    try {
      if (val) {
        const allowed = await requestVkMessagesFromGroup(true);
        if (allowed) {
          await updateMessagesPermission(true);
          await refreshUser();
        }
      }
      await updateNotifications(val);
    } catch (err) {
      console.error(err);
      setNotificationsEnabled(!val);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleTogglePref = async (key: keyof NotificationPrefs, val: boolean) => {
    const next = { ...notificationPrefs, [key]: val };
    setNotificationPrefs(next);
    setNotificationsLoading(true);
    try {
      await updateNotificationPrefs(next);
    } catch (err) {
      console.error(err);
      setNotificationPrefs(notificationPrefs);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const formatUpcomingSubtitle = (block: NonNullable<HomeData['upcomingBlock']>) => {
    const start = new Date(block.startTime);
    const diffMin = Math.round((start.getTime() - Date.now()) / 60000);
    const timeStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const prefix = diffMin > 0 && diffMin <= 180 ? `Через ${diffMin} мин · ` : `${timeStr} · `;
    return `${prefix}${block.title}${block.place ? ` · ${block.place}` : ''}`;
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="feedback"
        onClose={() => setActiveModal(null)}
        header={
          <ModalPageHeader>
            Связь с организаторами
          </ModalPageHeader>
        }
      >
        <FormItem top="Твое сообщение">
          <Textarea 
            value={feedbackText} 
            onChange={(e) => setFeedbackText(e.target.value)} 
            placeholder="Напиши вопрос или предложение..."
          />
        </FormItem>
        <Div>
          <Button size="l" mode="primary" stretched loading={feedbackSubmitting} onClick={() => void handleFeedbackSubmit()}>
            Отправить
          </Button>
        </Div>
      </ModalPage>
      <ModalPage
        id="info"
        onClose={() => setActiveModal(null)}
        header={
          <ModalPageHeader>
            О приложении
          </ModalPageHeader>
        }
      >
        <Div style={{ lineHeight: 1.5 }}>
          <p>Привет! Это официальное приложение Форума неформального образования.</p>
          <p>Здесь ты можешь:</p>
          <ul>
            <li>Следить за расписанием и узнавать, что сейчас идет в программе</li>
            <li>Выполнять задания и получать за них баллы</li>
            <li>Делиться опытом с другими участниками</li>
            <li>Проходить чек-ины состояния и вечернюю рефлексию</li>
            <li>Следить за своим местом в рейтинге трека</li>
          </ul>
          <p>За активное участие ты получаешь баллы, которые помогут тебе подняться в рейтинге!</p>
          <Spacing size={16} />
          
          <SimpleCell
            after={
              <Switch
                checked={notificationsEnabled}
                onChange={(e) => void handleToggleNotifications(e)}
                disabled={notificationsLoading}
              />
            }
            subtitle="Сообщения от сообщества Форума НФО в личку VK"
          >
            Уведомления
          </SimpleCell>

          <SimpleCell
            subtitle="Личные сообщения от сообщества «Цифровой Машук»"
          >
            Сообщения от сообщества
          </SimpleCell>

          {([
            ['program', 'Программа и расписание'],
            ['questions', 'Вопросы и рефлексия'],
            ['tasks', 'Задания'],
            ['exchange', 'Обмен опытом'],
            ['points', 'Баллы и рейтинг'],
          ] as const).map(([key, label]) => (
            <SimpleCell
              key={key}
              after={
                <Switch
                  checked={notificationPrefs[key]}
                  disabled={notificationsLoading || !notificationsEnabled}
                  onChange={(e) => void handleTogglePref(key, e.target.checked)}
                />
              }
            >
              {label}
            </SimpleCell>
          ))}

          <Spacing size={16} />
          <Button mode="primary" style={{ backgroundColor: 'var(--vkui--color_background_negative)' }} stretched onClick={() => void handleDeleteAccount()}>
            Удалить аккаунт
          </Button>
        </Div>
      </ModalPage>
    </ModalRoot>
  );

  const checkinInfo = data?.checkin ?? { available: true, activeSlot: null, slotLabel: null, canSubmit: false, nextSlotAt: null };

  return (
    <>
      <Panel id="home" className="nfo-home">
      <PullToRefresh onRefresh={() => load()} isFetching={loading}>
      <GradientHeader title="Главная" subtitle="Форум неформального образования" variant="main">
        <div className="nfo-home-header-meta">
          <Text weight="2">{dateStr}</Text>
          {programDay ? <Text weight="2">День {programDay}</Text> : null}
        </div>
        <UserProfileCard user={data?.user ?? user} trackRank={data?.trackRank} />
      </GradientHeader>

      {user && !user.messagesFromGroupAllowed && (
        <CommunityMessagesBanner onEnabled={() => void refreshUser()} />
      )}

      {data?.focusOfDay && (
        <Div className="nfo-home-focus-wrap">
          <div className="nfo-focus-day" style={{ cursor: 'default' }}>
            <div className="nfo-focus-day__label">Фокус дня</div>
            <div className="nfo-focus-day__title">{data.focusOfDay.title}</div>
          </div>
        </Div>
      )}

      <Group header={<div className="nfo-sec-title">Сейчас в программе</div>}>
        {event ? (
          <CurrentBlockCard event={event} />
        ) : (
          <Div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--vkui--color_text_secondary)' }}>
            Сейчас нет активного блока по расписанию. Загляни в «Что далее» ниже или открой программу.
          </Div>
        )}
      </Group>

      <Group header={<div className="nfo-sec-title">Активности</div>}>
        <Div style={{ padding: '12px 16px' }}>
          {data?.upcomingBlock && (
            <div className="nfo-hcard" onClick={() => navigate('/schedule')}>
              <ActivityIcon emoji="📅" variant="schedule" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Что далее</div>
                <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>
                  {formatUpcomingSubtitle(data.upcomingBlock)}
                </div>
              </div>
              <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
            </div>
          )}

          <div className="nfo-hcard" onClick={() => navigate('/questions')}>
            <ActivityIcon emoji="💬" variant="questions" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Активные вопросы</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>{data?.stats.activeQuestions ?? 0} доступно</div>
            </div>
            {data?.stats.activeQuestions ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e74c3c' }} /> : null}
            <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
          </div>

          <div className="nfo-hcard" onClick={() => navigate('/tasks')}>
            <ActivityIcon emoji="⭐" variant="tasks" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Активные задания</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>{data?.stats.tasksAvailable ?? 0} доступных · {data?.stats.tasksCompleted ?? 0} выполнено</div>
            </div>
            <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
          </div>
          
          <div
            className="nfo-hcard"
            style={data?.stats.exchangeActiveCycle
              ? { border: '2px solid var(--nfo-primary)', boxShadow: '0 0 0 1px rgba(79, 62, 192, 0.15)' }
              : undefined}
            onClick={() => navigate('/exchange')}
          >
            <ActivityIcon emoji="💡" variant="exchange" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Активный обмен опытом</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>
                {data?.stats.activeExchange ?? 0} вопросов
                {data?.stats.pendingIncomingAssignments
                  ? ` · ${data.stats.pendingIncomingAssignments} ждут ответа`
                  : data?.stats.newExchangeAnswers
                    ? ` · ${data.stats.newExchangeAnswers} новых ответа`
                    : ''}
              </div>
            </div>
            {(data?.stats.newExchangeAnswers || data?.stats.pendingIncomingAssignments) ? (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e74c3c' }} />
            ) : null}
            <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
          </div>

          <div className="nfo-hcard" onClick={() => navigate('/nfo-day')}>
            <ActivityIcon emoji="🌅" variant="neutral" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Каким было НФО сегодня?</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>Вечерняя рефлексия дня</div>
            </div>
            <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
          </div>

          {checkinInfo.available && (
          <div className="nfo-hcard" onClick={() => navigate('/checkin')}>
            <ActivityIcon emoji="😊" variant="questions" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Как ты сейчас?</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>
                {checkinInfo.slotLabel ?? 'Чек-ин состояния'}
              </div>
            </div>
            {checkinInfo.canSubmit ? (
              <span className="nfo-hcard-badge">Перейти</span>
            ) : null}
            <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
          </div>
          )}

          {data?.diagnostics.available && (
            <div className="nfo-hcard" style={{ background: 'linear-gradient(135deg, #4f3ec0, #7b5ecf)', color: '#fff' }} onClick={() => navigate('/diagnostics')}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎯</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Самодиагностика тренера</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  {data.diagnostics.isCompleted
                    ? 'Пройдена · смотреть профиль'
                    : data.diagnostics.completedBlocks > 0
                      ? `Продолжить · ${data.diagnostics.completedBlocks}/${data.diagnostics.totalBlocks} блоков`
                      : '9 ключевых умений · ~5 минут'}
                </div>
              </div>
              {!data.diagnostics.isCompleted && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
              )}
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>›</div>
            </div>
          )}

          {user.role === 'admin' && (
            <div className="nfo-hcard" onClick={() => navigate('/admin')}>
              <ActivityIcon emoji="⚙️" variant="neutral" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Админка</div>
                <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>Управление форумом</div>
              </div>
              <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
            </div>
          )}
        </Div>
      </Group>

      <Group header={<div className="nfo-sec-title">Прогресс</div>}>
        <div className="nfo-progress-grid">
          <div className="nfo-card nfo-progress-card">
            <div style={{ fontSize: 20 }}>🏆</div>
            <Headline level="2" weight="2" style={{ marginTop: 4 }}>{data?.trackRank ?? '—'}</Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>место в треке</div>
            <div className="nfo-progress-card__spacer" />
            <div>
              <ProgressBar value={user.points} max={200} color="var(--nfo-primary)" />
            </div>
          </div>
          <div
            className="nfo-card nfo-progress-card nfo-card--clickable"
            onClick={() => navigate('/reflection-level')}
          >
            <ActivityIcon emoji="🧠" variant="purple" />
            <Headline level="2" weight="2" style={{ marginTop: 4 }}>Ур. {user.reflectionLevel}</Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>рефлексия · {user.reflectionPoints} б.</div>
            <div style={{ marginTop: 4 }}>
              <ProgressBar value={reflectionProgress} max={100} />
            </div>
            {pointsToNextLevel > 0 && nextLevel != null && (
              <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                {pointsToNextLevel} б. до {nextLevel} ур.
              </div>
            )}
          </div>
        </div>
      </Group>

      <Group>
        <Div style={{ padding: '0 16px 16px' }}>
          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/rating')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Рейтинг</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>Общий рейтинг участников</div>
            </div>
            <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
          </div>
        </Div>
      </Group>

      <Group>
        <div className="nfo-home-footer-btns">
          <Button size="l" mode="outline" stretched onClick={() => setActiveModal('feedback')}>
            Связь с организаторами
          </Button>
          <Button size="l" mode="outline" stretched onClick={() => navigate('/settings')}>
            Настройки
          </Button>
          <Button size="l" mode="outline" stretched onClick={() => setActiveModal('info')}>
            О приложении
          </Button>
        </div>
      </Group>
      </PullToRefresh>
    </Panel>
    {modal}
    </>
  );
}
