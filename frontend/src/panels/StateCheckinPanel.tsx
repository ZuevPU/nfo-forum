import {
  Button,
  Div,
  Group,
  Headline,
  Placeholder,
  SimpleCell,
  Spinner,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchCheckinHistory,
  submitCheckin,
  type Checkin,
} from '../api/state';
import { PanelLayout } from '../components/PanelLayout';

const ENERGY_LEVELS = [
  { level: 0, label: 'еле держусь' },
  { level: 1, label: '' },
  { level: 2, label: '' },
  { level: 3, label: '' },
  { level: 4, label: '' },
  { level: 5, label: 'нормально' },
  { level: 6, label: '' },
  { level: 7, label: '' },
  { level: 8, label: '' },
  { level: 9, label: '' },
  { level: 10, label: 'заряжен' },
];

const EMOTIONS = [
  'тревога',
  'растерянность',
  'скука',
  'раздражение',
  'усталость',
  'спокойствие',
  'интерес',
  'вовлечённость',
  'воодушевление',
  'радость',
  'гордость',
];

export function StateCheckinPanel() {
  const [energy, setEnergy] = useState(5);
  const [emotion, setEmotion] = useState('спокойствие');
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
    <PanelLayout id="checkin" title="Как ты сейчас?" subtitle="30 секунд" useGradient backToHome>
      <Group header="Энергия (0-10)">
        <Div style={{ display: 'flex', justifyContent: 'space-between', overflowX: 'auto' }}>
          {ENERGY_LEVELS.map((e) => (
            <div
              key={e.level}
              onClick={() => setEnergy(e.level)}
              style={{
                textAlign: 'center',
                padding: '8px 4px',
                borderRadius: 10,
                background: energy === e.level ? 'var(--vkui--color_background_secondary_alpha)' : undefined,
                cursor: 'pointer',
                minWidth: 28,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: energy === e.level ? 'bold' : 'normal' }}>{e.level}</div>
              {e.label && <div style={{ fontSize: 9, marginTop: 4 }}>{e.label}</div>}
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
        <Div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>Комментарий (необязательно)</div>
          <textarea 
            className="nfo-input"
            rows={3}
            placeholder="Моё состояние вызвано тем, что..." 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
          />
        </Div>
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
              {c.emotion} · энергия {c.energyLevel}/10
            </SimpleCell>
          ))}
        </Group>
      ) : null}
    </PanelLayout>
  );
}
