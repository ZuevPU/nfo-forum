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
        <SimpleCell
          before={<span style={{ fontSize: 24 }}>⭐</span>}
          subtitle={`${data?.stats.tasksAvailable ?? 0} доступных · ${data?.stats.tasksCompleted ?? 0} выполнено`}
          indicator={<span>›</span>}
          onClick={() => navigate('/tasks')}
        >
          Задания
        </SimpleCell>
        <SimpleCell
          before={<span style={{ fontSize: 24 }}>💡</span>}
          subtitle={`${data?.stats.newExchangeAnswers ?? 0} новых ответа`}
          after={data?.stats.newExchangeAnswers ? <Badge mode="prominent">new</Badge> : undefined}
          indicator={<span>›</span>}
          onClick={() => navigate('/exchange')}
        >
          Обмен опытом
        </SimpleCell>
        <SimpleCell
          before={<span style={{ fontSize: 24 }}>😊</span>}
          subtitle="Чек-ин состояния"
          indicator={<span>›</span>}
          onClick={() => navigate('/checkin')}
        >
          Как ты сейчас?
        </SimpleCell>
        <SimpleCell
          before={<span style={{ fontSize: 24 }}>🏆</span>}
          subtitle="Рейтинг участников"
          indicator={<span>›</span>}
          onClick={() => navigate('/rating')}
        >
          Рейтинг
        </SimpleCell>
        <SimpleCell
          before={<span style={{ fontSize: 24 }}>🌙</span>}
          subtitle="Вечерняя рефлексия"
          indicator={<span>›</span>}
          onClick={() => navigate('/reflection')}
        >
          Рефлексия
        </SimpleCell>
        {user.role === 'admin' && (
          <SimpleCell
            before={<span style={{ fontSize: 24 }}>⚙️</span>}
            subtitle="Управление форумом"
            indicator={<span>›</span>}
            onClick={() => navigate('/admin')}
          >
            Админка
          </SimpleCell>
        )}
      </Group>
      <Group header="Прогресс">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
          <Card mode="shadow">
            <Div>
              <div style={{ fontSize: 20 }}>🏆</div>
              <Headline level="2" weight="2">{data?.trackRank ?? '—'}</Headline>
              <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>место в треке</div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={user.points} max={200} color="var(--nfo-primary)" />
              </div>
            </Div>
          </Card>
          <Card mode="shadow">
            <Div>
              <div style={{ fontSize: 20 }}>💭</div>
              <Headline level="2" weight="2">Ур. {user.reflectionLevel}</Headline>
              <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>рефлексия · {user.reflectionPoints} б.</div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={user.reflectionPoints} max={100} />
              </div>
            </Div>
          </Card>
        </div>
      </Group>
    </Panel>
  );
}
