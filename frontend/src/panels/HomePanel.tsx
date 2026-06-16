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
  PanelHeaderButton,
  FormItem,
  Textarea,
  Button,
} from '@vkontakte/vkui';
import { Icon24Dismiss } from '@vkontakte/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHome, submitFeedback, type HomeData } from '../api/home';
import { CurrentBlockCard } from '../components/CurrentBlockCard';
import { GradientHeader } from '../components/GradientHeader';
import { ProgressBar } from '../components/ProgressBar';
import { UserProfileCard } from '../components/UserProfileCard';
import { useAuthContext } from '../contexts/AuthContext';

function getProgramDayInfo() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const dateStr = formatter.format(now);

  let programDay = null;
  if (month === 5 && year === 2026) {
    if (day === 18) programDay = 1;
    else if (day === 19) programDay = 2;
    else if (day === 20) programDay = 3;
    else if (day === 21) programDay = 4;
  }

  return { dateStr, programDay };
}

export function HomePanel() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    fetchHome()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const REFLECTION_THRESHOLDS = [0, 30, 70, 120, 200];
  const nextLevelPoints = REFLECTION_THRESHOLDS[user.reflectionLevel] ?? 200;
  const prevLevelPoints = REFLECTION_THRESHOLDS[user.reflectionLevel - 1] ?? 0;
  const reflectionProgress = Math.min(100, Math.max(0, ((user.reflectionPoints - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100)) || 0;
  const pointsToNextLevel = Math.max(0, nextLevelPoints - user.reflectionPoints);

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

  const modal = (
    <ModalRoot activeModal={activeModal}>
      <ModalPage
        id="feedback"
        header={
          <ModalPageHeader
            before={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}
          >
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
          <Button size="l" stretched loading={feedbackSubmitting} onClick={() => void handleFeedbackSubmit()}>
            Отправить
          </Button>
        </Div>
      </ModalPage>
      <ModalPage
        id="info"
        header={
          <ModalPageHeader
            before={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}
          >
            О боте
          </ModalPageHeader>
        }
      >
        <Div style={{ lineHeight: 1.5 }}>
          <p>Привет! Это официальный бот Форума неформального образования.</p>
          <p>Здесь ты можешь:</p>
          <ul>
            <li>Следить за расписанием и узнавать, что сейчас идет в программе</li>
            <li>Выполнять задания и получать за них баллы</li>
            <li>Делиться опытом с другими участниками</li>
            <li>Проходить чек-ины состояния и вечернюю рефлексию</li>
            <li>Следить за своим местом в рейтинге трека</li>
          </ul>
          <p>За активное участие ты получаешь баллы, которые помогут тебе подняться в рейтинге!</p>
        </Div>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <>
      <Panel id="home">
      <GradientHeader title="Главная" subtitle="Форум неформального образования">
        <Div style={{ marginTop: 12 }}><UserProfileCard user={data?.user ?? user} trackRank={data?.trackRank} /></Div>
        <Div style={{ paddingBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.9)' }}>
            <Text weight="2">{dateStr}</Text>
            {programDay ? <Text weight="2">День {programDay}</Text> : null}
          </div>
        </Div>
      </GradientHeader>
      
      {data?.focusOfDay && (
        <Group>
          <Div style={{ padding: '0 16px' }}>
            <div className="nfo-gradient-green" style={{ borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }} onClick={() => navigate('/tasks')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <Text weight="2" style={{ color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', fontSize: 12 }}>Фокус дня</Text>
              </div>
              <Headline level="2" weight="2" style={{ color: '#fff' }}>{data.focusOfDay.title}</Headline>
            </div>
          </Div>
        </Group>
      )}

      {event && (
        <Group>
          <CurrentBlockCard event={event} />
        </Group>
      )}

      <Group header="Активности">
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          {data?.upcomingBlock && (
            <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/schedule')}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Что далее</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{data.upcomingBlock.title}</div>
              </div>
              <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
            </div>
          )}

          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/questions')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌙</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Активные вопросы</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{data?.stats.activeQuestions ?? 0} доступно</div>
            </div>
            {data?.stats.activeQuestions ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e74c3c' }} /> : null}
            <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
          </div>

          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/tasks')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Активные задания</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{data?.stats.tasksAvailable ?? 0} доступных · {data?.stats.tasksCompleted ?? 0} выполнено</div>
            </div>
            <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
          </div>
          
          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/exchange')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Активный обмен опытом</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{data?.stats.activeExchange ?? 0} вопросов · {data?.stats.newExchangeAnswers ?? 0} новых ответа</div>
            </div>
            {data?.stats.newExchangeAnswers ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e74c3c' }} /> : null}
            <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
          </div>

          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/checkin')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>😊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Как ты сейчас?</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Чек-ин состояния</div>
            </div>
            <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
          </div>

          {user.role === 'admin' && (
            <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/admin')}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚙️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Админка</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Управление форумом</div>
              </div>
              <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
            </div>
          )}
        </Div>
      </Group>

      <Group header="Прогресс">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
          <div className="nfo-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ fontSize: 20 }}>🏆</div>
            <Headline level="2" weight="2" style={{ marginTop: 'auto' }}>{data?.trackRank ?? '—'}</Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>место в треке</div>
            <div style={{ marginTop: 8 }}>
              <ProgressBar value={user.points} max={200} color="var(--nfo-primary)" />
            </div>
          </div>
          <div className="nfo-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ fontSize: 20 }}>💭</div>
            <Headline level="2" weight="2" style={{ marginTop: 'auto' }}>Ур. {user.reflectionLevel}</Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>рефлексия · {user.reflectionPoints} б.</div>
            <div style={{ marginTop: 8 }}>
              <ProgressBar value={reflectionProgress} max={100} />
            </div>
            {pointsToNextLevel > 0 && user.reflectionLevel < 5 && (
              <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                {pointsToNextLevel} б. до {user.reflectionLevel + 1} ур.
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
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Общий рейтинг участников</div>
            </div>
            <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
          </div>
        </Div>
      </Group>

      <Group>
        <Div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
          <Button mode="secondary" stretched onClick={() => setActiveModal('feedback')}>
            Связь с организаторами
          </Button>
          <Button mode="secondary" stretched onClick={() => setActiveModal('info')}>
            О боте
          </Button>
        </Div>
      </Group>
    </Panel>
    {modal}
    </>
  );
}
