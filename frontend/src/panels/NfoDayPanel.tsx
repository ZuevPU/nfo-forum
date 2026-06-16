import { Button, Div, Group } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchNfoDayConfig,
  fetchNfoDayToday,
  submitNfoDayReflection,
  type NfoDayConfig,
  type NfoDayReflection,
} from '../api/reflection';
import { NFO_DAY_QUESTION } from '../constants/nfoFactors';
import { PanelLayout } from '../components/PanelLayout';

export function NfoDayPanel() {
  const [config, setConfig] = useState<NfoDayConfig | null>(null);
  const [existing, setExisting] = useState<NfoDayReflection | null>(null);
  const [answer, setAnswer] = useState('');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchNfoDayConfig(), fetchNfoDayToday()])
      .then(([cfg, today]) => {
        setConfig(cfg);
        setExisting(today.reflection);
        if (today.reflection) {
          setAnswer(today.reflection.answerText);
          setSelectedFactors(today.reflection.factors);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleFactor = (factor: string) => {
    if (existing) return;
    setSelectedFactors((prev) => {
      if (prev.includes(factor)) return prev.filter((f) => f !== factor);
      if (prev.length >= 3) return prev;
      return [...prev, factor];
    });
  };

  const handleSubmit = async () => {
    if (!answer.trim() || selectedFactors.length === 0) return;
    setSubmitting(true);
    try {
      await submitNfoDayReflection(answer.trim(), selectedFactors);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  const factors = config?.factors ?? [];

  return (
    <PanelLayout
      id="nfo-day"
      title="Вопрос дня"
      subtitle="Вечерняя рефлексия"
      loading={loading}
      error={error}
    >
      <Group>
        <Div style={{ padding: '12px 16px' }}>
          <div className="nfo-card" style={{ margin: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-primary)', textTransform: 'uppercase', marginBottom: 8 }}>
              {existing ? '✅ Отвечено' : `${config?.points ?? 10} баллов`}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 12 }}>
              {config?.question ?? NFO_DAY_QUESTION}
            </div>
            <textarea
              className="nfo-input"
              rows={4}
              placeholder="Поделись своими мыслями..."
              value={answer}
              readOnly={!!existing}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
        </Div>
      </Group>

      <Group header="Что больше всего повлияло? (до 3)">
        <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 12px' }}>
          {factors.map((factor) => {
            const selected = selectedFactors.includes(factor);
            return (
              <button
                key={factor}
                type="button"
                disabled={!!existing}
                onClick={() => toggleFactor(factor)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 20,
                  border: selected ? '2px solid var(--nfo-primary)' : '1px solid #d0d4ff',
                  background: selected ? 'rgba(59,75,192,0.1)' : '#fff',
                  fontSize: 12,
                  fontWeight: selected ? 600 : 400,
                  cursor: existing ? 'default' : 'pointer',
                  opacity: !selected && selectedFactors.length >= 3 && !existing ? 0.5 : 1,
                }}
              >
                {factor}
              </button>
            );
          })}
        </Div>
      </Group>

      {!existing && (
        <Group>
          <Div style={{ padding: '0 16px 16px' }}>
            <Button
              size="l"
              stretched
              loading={submitting}
              disabled={!answer.trim() || selectedFactors.length === 0}
              onClick={() => void handleSubmit()}
            >
              Отправить ответ
            </Button>
          </Div>
        </Group>
      )}
    </PanelLayout>
  );
}
