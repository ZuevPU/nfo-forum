import {
  Badge,
  Card,
  Div,
  Group,
  Headline,
  Panel,
  PanelHeader,
  SimpleCell,
  Spinner,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHome, type HomeData } from '../api/home';
import { CurrentBlockCard } from '../components/CurrentBlockCard';
import { GradientHeader } from '../components/GradientHeader';
import { ProgressBar } from '../components/ProgressBar';
import { UserProfileCard } from '../components/UserProfileCard';
import { useAuthContext } from '../contexts/AuthContext';

export function HomePanel() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const event = data?.currentEvent ?? data?.upcomingBlock ?? null;

  return (
    <Panel id="home">
      <GradientHeader title="Главная" subtitle="Форум неформального образования">
        <Div style={{ marginTop: 12 }}><UserProfileCard user={data?.user ?? user} trackRank={data?.trackRank} /></Div>
      </GradientHeader>
      <Group>
        <CurrentBlockCard event={event} />
      </Group>
      <Group>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/tasks')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Задания</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{data?.stats.tasksAvailable ?? 0} доступных · {data?.stats.tasksCompleted ?? 0} выполнено</div>
            </div>
            <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
          </div>
          
          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/exchange')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Обмен опытом</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{data?.stats.newExchangeAnswers ?? 0} новых ответа</div>
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

          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/rating')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Рейтинг</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Рейтинг участников</div>
            </div>
            <div style={{ color: '#ccc', fontSize: 20 }}>›</div>
          </div>

          <div className="nfo-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/reflection')}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f2f3f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌙</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Рефлексия</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Вечерняя рефлексия</div>
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
          <div className="nfo-card" style={{ margin: 0 }}>
            <div style={{ fontSize: 20 }}>🏆</div>
            <Headline level="2" weight="2">{data?.trackRank ?? '—'}</Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>место в треке</div>
            <div style={{ marginTop: 8 }}>
              <ProgressBar value={user.points} max={200} color="var(--nfo-primary)" />
            </div>
          </div>
          <div className="nfo-card" style={{ margin: 0 }}>
            <div style={{ fontSize: 20 }}>💭</div>
            <Headline level="2" weight="2">Ур. {user.reflectionLevel}</Headline>
            <div style={{ fontSize: 10, color: 'var(--vkui--color_text_secondary)' }}>рефлексия · {user.reflectionPoints} б.</div>
            <div style={{ marginTop: 8 }}>
              <ProgressBar value={user.reflectionPoints} max={100} />
            </div>
          </div>
        </div>
      </Group>
    </Panel>
  );
}
