import {
  Button,
  Div,
  FormItem,
  Group,
  Headline,
  Placeholder,
  SimpleCell,
  Spinner,
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchCheckinHistory,
  submitCheckin,
  type Checkin,
} from '../api/state';
import { PanelLayout } from '../components/PanelLayout';

const ENERGY_LEVELS = [
  { level: 1, emoji: '😴', label: 'пусто' },
  { level: 2, emoji: '😕', label: 'низко' },
  { level: 3, emoji: '😊', label: 'нормально' },
  { level: 4, emoji: '😄', label: 'бодро' },
  { level: 5, emoji: '🚀', label: 'заряжен' },
];

const EMOTIONS = ['любопытство', 'открытость', 'тревога', 'усталость', 'радость'];

export function StateCheckinPanel() {
  const [energy, setEnergy] = useState(3);
  const [emotion, setEmotion] = useState('открытость');
  const [comment, setComment] = useState('');
  const [history, setHistory] = useState<Checkin[]>([]);
  const [botReaction, setBotReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckinHistory()
      .then((r) => setHistory(r.checkins))
      .catch((e) => setHistoryError(e instanceof Error ? e.message : 'Ошибка загрузки истории'))
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await submitCheckin(emotion, energy, comment || undefined);
      setBotReaction(result.botReaction);
      const h = await fetchCheckinHistory();
      setHistory(h.checkins);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelLayout id="checkin" title="Как ты сейчас?" subtitle="30 секунд">
      <Group header="Энергия">
        <Div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {ENERGY_LEVELS.map((e) => (
            <div
              key={e.level}
              onClick={() => setEnergy(e.level)}
              style={{
                textAlign: 'center',
                padding: 8,
                borderRadius: 10,
                background: energy === e.level ? 'var(--vkui--color_background_secondary_alpha)' : undefined,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 24 }}>{e.emoji}</div>
              <div style={{ fontSize: 10 }}>{e.label}</div>
            </div>
          ))}
        </Div>
      </Group>
      <Group header="Настроение">
        <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EMOTIONS.map((em) => (
            <Button
              key={em}
              size="s"
              mode={emotion === em ? 'primary' : 'secondary'}
              onClick={() => setEmotion(em)}
            >
              {em}
            </Button>
          ))}
        </Div>
      </Group>
      <Group>
        <FormItem top="Комментарий (необязательно)">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </FormItem>
        <Div>
          <Button size="l" stretched loading={loading} onClick={() => void handleSubmit()}>
            Отправить чек-ин
          </Button>
        </Div>
      </Group>
      {botReaction && (
        <Group header="Реакция помощника">
          <Div><Headline level="2">{botReaction}</Headline></Div>
        </Group>
      )}
      {historyLoading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></Div>
      ) : historyError ? (
        <Placeholder>{historyError}</Placeholder>
      ) : history.length > 0 ? (
        <Group header="История">
          {history.map((c) => (
            <SimpleCell key={c.id} subtitle={new Date(c.createdAt).toLocaleString('ru-RU')}>
              {c.emotion} · энергия {c.energyLevel}/5
            </SimpleCell>
          ))}
        </Group>
      ) : null}
    </PanelLayout>
  );
}
