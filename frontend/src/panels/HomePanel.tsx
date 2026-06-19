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
  Button,
  Spacing,
  SimpleCell,
  PullToRefresh,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchHome, type HomeData } from '../api/home';
import { applyNetworkingLunch } from '../api/tasks';
import { FeedbackOrganizersContent } from '../components/FeedbackOrganizersContent';
import { fetchReflectionLevel } from '../api/rating';
import { CurrentBlockCard } from '../components/CurrentBlockCard';
import { EmptyState } from '../components/EmptyState';
import { ActivityIcon } from '../components/ActivityIcon';
import { GradientHeader } from '../components/GradientHeader';
import { NotificationBell } from '../components/NotificationBell';
import { ProgressBar } from '../components/ProgressBar';
import { UserProfileCard } from '../components/UserProfileCard';
import { CommunityMessagesBanner } from '../components/CommunityMessagesBanner';
import { NetworkingLunchHomeSection } from '../components/NetworkingLunchHomeSection';
import { useAuthContext } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { navBadgesFromHome } from '../lib/participantSnapshot';
import { requestVkNotifications } from '../lib/vk-bridge';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, deleteUserAccount, refreshUser, syncUser } = useAuthContext();
  const { setNavBadges } = useLayout();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [reflectionThresholds, setReflectionThresholds] = useState<number[]>(DEFAULT_REFLECTION_THRESHOLDS);
  const [lunchLoading, setLunchLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchHome()
      .then((homeData) => {
        setData(homeData);
        syncUser(homeData.user);
        setNavBadges(navBadgesFromHome(homeData));
        // #region agent log
        fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d5534'},body:JSON.stringify({sessionId:'9d5534',location:'HomePanel.tsx:load',message:'fetchHome resolved',data:{homeUserPoints:homeData.user.points},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
      })
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

  useEffect(() => {
    if (!user) return;

    if (sessionStorage.getItem('nfo_native_notif_prompt') !== '1') {
      sessionStorage.setItem('nfo_native_notif_prompt', '1');
      void requestVkNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get('feedback') === '1') {
      setActiveModal('feedback');
      searchParams.delete('feedback');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // #region agent log
  useEffect(() => {
    if (loading || !user) return;
    const displayPoints = (data?.user ?? user).points;
    fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d5534'},body:JSON.stringify({sessionId:'9d5534',location:'HomePanel.tsx:displayUser',message:'points sources',data:{authUserPoints:user.points,dataUserPoints:data?.user?.points ?? null,displayUserPoints:displayPoints,hasData:!!data},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  }, [loading, user, data]);
  // #endregion

  const handleApplyLunch = async () => {
    setLunchLoading(true);
    try {
      await applyNetworkingLunch();
      load();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не удалось записаться на обед');
    } finally {
      setLunchLoading(false);
    }
  };

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
  const displayUser = data?.user ?? user;

  const { progress: reflectionProgress, pointsToNextLevel, nextLevel } = getReflectionProgress(
    displayUser.reflectionLevel,
    displayUser.reflectionPoints,
    reflectionThresholds,
  );

  const handleDeleteAccount = async () => {
    if (window.confirm('Вы уверены, что хотите удалить свой аккаунт и все данные? Это действие необратимо.')) {
      await deleteUserAccount();
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
        <FeedbackOrganizersContent />
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
            <li>Проходить вопросы, чек-ины и вечернюю рефлексию во вкладке «Вопросы»</li>
            <li>Следить за своим местом в рейтинге трека</li>
          </ul>
          <p>За активное участие ты получаешь баллы, которые помогут тебе подняться в рейтинге!</p>
          <Spacing size={16} />

          <SimpleCell
            subtitle="Уведомления и сообщения от сообщества"
            onClick={() => navigate('/settings')}
          >
            Настройки уведомлений
          </SimpleCell>

          <Spacing size={16} />
          <Button mode="primary" style={{ backgroundColor: 'var(--vkui--color_background_negative)' }} stretched onClick={() => void handleDeleteAccount()}>
            Удалить аккаунт
          </Button>
        </Div>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <>
      <Panel id="home" className="nfo-home">
      <PullToRefresh onRefresh={() => load()} isFetching={loading}>
      <GradientHeader title="Главная" subtitle="Форум неформального образования" variant="main" actions={<NotificationBell />}>
        <div className="nfo-home-header-meta">
          <Text weight="2">{dateStr}</Text>
          {programDay ? <Text weight="2">День {programDay}</Text> : null}
        </div>
        <UserProfileCard user={displayUser} trackRank={data?.trackRank} />
      </GradientHeader>

      {user && !user.messagesFromGroupAllowed && (
        <CommunityMessagesBanner
          serverAllowed={user.messagesFromGroupAllowed}
          onEnabled={() => void refreshUser()}
        />
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
          <EmptyState message="Сейчас нет активного блока — программа скоро появится" />
        )}
      </Group>

      {data?.networkingLunch && (
        <Group header={<div className="nfo-sec-title">Регистрация на нетворкинг-обед</div>}>
          <NetworkingLunchHomeSection
            lunch={data.networkingLunch}
            loading={lunchLoading}
            onApply={() => void handleApplyLunch()}
          />
        </Group>
      )}

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
              <div style={{ fontSize: 14, fontWeight: 600 }}>Вопросы</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>
                {data?.stats.activeQuestions ?? 0} не отвечено · чек-ины и рефлексия
              </div>
            </div>
            {data?.stats.activeQuestions ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e74c3c' }} /> : null}
            <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
          </div>

          <div
            className="nfo-hcard"
            onClick={() => {
              navigate('/tasks');
            }}
          >
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
            <Headline level="2" weight="2" style={{ marginTop: 4 }}>
              {data?.trackRank && data.trackRank > 0 ? data.trackRank : '—'}
            </Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>место в треке</div>
            <div className="nfo-progress-card__spacer" />
            <div>
              <ProgressBar value={displayUser.points} max={200} color="var(--nfo-primary)" />
            </div>
          </div>
          <div
            className="nfo-card nfo-progress-card nfo-card--clickable"
            onClick={() => navigate('/reflection-level')}
          >
            <ActivityIcon emoji="🧠" variant="purple" />
            <Headline level="2" weight="2" style={{ marginTop: 4 }}>Ур. {displayUser.reflectionLevel}</Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>рефлексия · {displayUser.reflectionPoints} б.</div>
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
          <Button size="l" mode="outline" className="nfo-btn-gray-blue" stretched onClick={() => setActiveModal('feedback')}>
            Связь с организаторами
          </Button>
          <Button size="l" mode="outline" className="nfo-btn-gray-blue" stretched onClick={() => navigate('/settings')}>
            Настройки
          </Button>
          <Button size="l" mode="outline" className="nfo-btn-gray-blue" stretched onClick={() => setActiveModal('info')}>
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
