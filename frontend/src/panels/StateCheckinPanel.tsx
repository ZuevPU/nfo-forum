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
  fetchCheckinStatus,
  submitCheckin,
  type Checkin,
  type CheckinStatus,
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
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [botReaction, setBotReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadStatus = () => {
    fetchCheckinStatus()
      .then((r) => setStatus(r.status))
      .catch(console.error);
  };

  useEffect(() => {
    loadStatus();
    fetchCheckinHistory()
      .then((r) => setHistory(r.checkins))
      .catch((e) => setHistoryError(e instanceof Error ? e.message : 'Ошибка загрузки истории'))
      .finally(() => setHistoryLoading(false));
  }, []);

  const canSubmit = status?.canSubmit ?? true;

  const handleSubmit = async () => {
    setSubmitError(null);
    setLoading(true);
    try {
      const result = await submitCheckin(emotion, energy, comment || undefined);
      setBotReaction(result.botReaction);
      const h = await fetchCheckinHistory();
      setHistory(h.checkins);
      loadStatus();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось отправить чек-ин';
      setSubmitError(message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const closedMessage = () => {
    if (!status) return null;
    if (status.answeredInCurrentSlot) {
      return status.nextSlotAt
        ? `Чек-ин принят. Следующий — в ${status.nextSlotAt}${status.nextSlotLabel ? ` (${status.nextSlotLabel})` : ''}.`
        : 'Чек-ин на сегодня принят. До завтра!';
    }
    if (status.nextSlotAt) {
      return `Чек-ин откроется в ${status.nextSlotAt}${status.nextSlotLabel ? ` (${status.nextSlotLabel})` : ''}.`;
    }
    return 'Чек-ин сейчас недоступен.';
  };

  return (
    <PanelLayout
      id="checkin"
      title={status?.title ?? 'Как ты сейчас?'}
      subtitle={status?.subtitle ?? '30 секунд'}
      useGradient
      backToHome
    >
      {!canSubmit && (
        <Group>
          <Div style={{ padding: '12px 16px' }}>
            <Placeholder>{closedMessage()}</Placeholder>
          </Div>
        </Group>
      )}

      {canSubmit && (
        <>
          <Group header="Энергия (0-10)">
            <Div style={{ display: 'flex', justifyContent: 'space-between', overflowX: 'auto', alignItems: 'flex-end', gap: 2 }}>
              {ENERGY_LEVELS.map((e) => (
                <div key={e.level} style={{ textAlign: 'center', minWidth: 36 }}>
                  <button
                    type="button"
                    className={`nfo-checkin-energy-btn${energy === e.level ? ' nfo-checkin-energy-btn--selected' : ''}`}
                    onClick={() => setEnergy(e.level)}
                  >
                    {e.level}
                  </button>
                  {e.label && <div style={{ fontSize: 9, marginTop: 4, color: 'var(--vkui--color_text_secondary)' }}>{e.label}</div>}
                </div>
              ))}
            </Div>
          </Group>
          <Group header="Настроение">
            <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`nfo-checkin-emotion-chip${emotion === em ? ' nfo-checkin-emotion-chip--selected' : ''}`}
                  onClick={() => setEmotion(em)}
                >
                  {em}
                </button>
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
              <Button size="l" mode="primary" stretched loading={loading} onClick={() => void handleSubmit()}>
                Отправить чек-ин
              </Button>
              {submitError && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#e74c3c', textAlign: 'center' }}>{submitError}</div>
              )}
            </Div>
          </Group>
        </>
      )}

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
