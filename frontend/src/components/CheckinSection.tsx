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

const DEFAULT_EMOTIONS = [
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

const DEFAULT_ENERGY_LEVELS = [
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

function buildEnergyLevels(status: CheckinStatus | null) {
  const low = status?.energyLowLabel ?? 'еле держусь';
  const mid = status?.energyMidLabel ?? 'нормально';
  const high = status?.energyHighLabel ?? 'заряжен';
  return DEFAULT_ENERGY_LEVELS.map((e) => {
    if (e.level === 0) return { ...e, label: low };
    if (e.level === 5) return { ...e, label: mid };
    if (e.level === 10) return { ...e, label: high };
    return e;
  });
}

interface CheckinSectionProps {
  showHistory?: boolean;
  onSubmitted?: () => void;
}

export function CheckinSection({ showHistory = true, onSubmitted }: CheckinSectionProps) {
  const [energy, setEnergy] = useState(5);
  const [emotion, setEmotion] = useState('спокойствие');
  const [comment, setComment] = useState('');
  const [history, setHistory] = useState<Checkin[]>([]);
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [botReaction, setBotReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(showHistory);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadStatus = () => {
    fetchCheckinStatus()
      .then((r) => setStatus(r.status))
      .catch(console.error)
      .finally(() => setStatusLoading(false));
  };

  useEffect(() => {
    loadStatus();
    if (!showHistory) return;
    fetchCheckinHistory()
      .then((r) => setHistory(r.checkins))
      .catch((e) => setHistoryError(e instanceof Error ? e.message : 'Ошибка загрузки истории'))
      .finally(() => setHistoryLoading(false));
  }, [showHistory]);

  const canSubmit = status?.canSubmit ?? true;
  const emotions = status?.emotions?.length ? status.emotions : DEFAULT_EMOTIONS;
  const energyLevels = buildEnergyLevels(status);

  useEffect(() => {
    if (emotions.length && !emotions.includes(emotion)) {
      setEmotion(emotions[0]);
    }
  }, [emotions, emotion]);

  const handleSubmit = async () => {
    setSubmitError(null);
    setLoading(true);
    try {
      const result = await submitCheckin(emotion, energy, comment || undefined);
      setBotReaction(result.botReaction);
      if (showHistory) {
        const h = await fetchCheckinHistory();
        setHistory(h.checkins);
      }
      loadStatus();
      onSubmitted?.();
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

  if (statusLoading) {
    return (
      <Div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spinner />
      </Div>
    );
  }

  if (!status?.available) return null;

  return (
    <>
      {!canSubmit && (
        <Div style={{ padding: '8px 16px 12px' }}>
          <div className="nfo-qcard" style={{ opacity: 0.85 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-primary)', textTransform: 'uppercase', marginBottom: 6 }}>
              Чек-ин состояния
            </div>
            <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.45 }}>
              {closedMessage()}
            </div>
          </div>
        </Div>
      )}

      {canSubmit && (
        <Div style={{ padding: '8px 16px 12px' }}>
          <div className="nfo-qcard">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-primary)', textTransform: 'uppercase', marginBottom: 6 }}>
              Чек-ин состояния · {status.slotLabel ?? 'сейчас'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>
              {status.title ?? 'Как ты сейчас?'}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>
              {status.energyLabel ?? 'Энергия (0-10)'}
            </div>
            <Div style={{ display: 'flex', justifyContent: 'space-between', overflowX: 'auto', alignItems: 'flex-end', gap: 2, padding: 0 }}>
              {energyLevels.map((e) => (
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

            <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
              {status.emotionLabel ?? 'Настроение'}
            </div>
            <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 0 }}>
              {emotions.map((em) => (
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

            <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
              Комментарий (необязательно)
            </div>
            <textarea
              className="nfo-input"
              rows={3}
              placeholder={status.commentPlaceholder ?? 'Моё состояние вызвано тем, что...'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <Button size="m" mode="primary" stretched style={{ marginTop: 12 }} loading={loading} onClick={() => void handleSubmit()}>
              Отправить чек-ин
            </Button>
            {submitError && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#e74c3c', textAlign: 'center' }}>{submitError}</div>
            )}
          </div>
        </Div>
      )}

      {botReaction && (
        <Group header="Реакция помощника">
          <Div><Headline level="2">{botReaction}</Headline></Div>
        </Group>
      )}

      {showHistory && (
        historyLoading ? (
          <Div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></Div>
        ) : historyError ? (
          <Placeholder>{historyError}</Placeholder>
        ) : history.length > 0 ? (
          <Group header="История чек-инов">
            {history.map((c) => (
              <SimpleCell key={c.id} subtitle={new Date(c.createdAt).toLocaleString('ru-RU')}>
                {c.emotion} · энергия {c.energyLevel}/10
              </SimpleCell>
            ))}
          </Group>
        ) : null
      )}
    </>
  );
}
