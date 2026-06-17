import { Button, Div, Spinner } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchNfoDayConfig,
  fetchNfoDayToday,
  submitNfoDayReflection,
  type NfoDayConfig,
  type NfoDayReflection,
} from '../api/reflection';
import { NFO_DAY_QUESTION } from '../constants/nfoFactors';

interface NfoDaySectionProps {
  onSubmitted?: () => void;
}

export function NfoDaySection({ onSubmitted }: NfoDaySectionProps) {
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
      if (prev.length >= 3) return [...prev.slice(1), factor];
      return [...prev, factor];
    });
  };

  const handleSubmit = async () => {
    if (!answer.trim() || selectedFactors.length === 0) return;
    setSubmitting(true);
    try {
      await submitNfoDayReflection(answer.trim(), selectedFactors);
      load();
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spinner />
      </Div>
    );
  }

  if (error) {
    return (
      <Div style={{ padding: '8px 16px 12px', fontSize: 13, color: '#e74c3c' }}>
        {error}
      </Div>
    );
  }

  const factors = config?.factors ?? [];
  const isLocked = config && config.isOpen === false && !existing;

  return (
    <Div style={{ padding: '8px 16px 12px' }}>
      <div className="nfo-qcard" style={{ opacity: isLocked ? 0.6 : 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-primary)', textTransform: 'uppercase', marginBottom: 6 }}>
          {existing ? '✅ Отвечено' : isLocked ? `🔒 Откроется в ${String(config?.publishHour ?? 19).padStart(2, '0')}:${String(config?.publishMinute ?? 30).padStart(2, '0')}` : `${config?.points ?? 10} баллов`}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 12 }}>
          {config?.question ?? NFO_DAY_QUESTION}
        </div>
        <textarea
          className="nfo-input"
          rows={4}
          placeholder="Поделись своими мыслями..."
          value={answer}
          readOnly={!!existing || !!isLocked}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
          Что больше всего повлияло? (до 3) · выбрано {selectedFactors.length}/3
        </div>
        {!existing && selectedFactors.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginBottom: 8 }}>
            Нажми на плашку ещё раз, чтобы убрать выбор
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {factors.map((factor) => {
            const selected = selectedFactors.includes(factor);
            return (
              <button
                key={factor}
                type="button"
                disabled={!!existing || !!isLocked}
                onClick={() => toggleFactor(factor)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 20,
                  border: selected ? '2px solid var(--nfo-primary)' : '1px solid #d0d4ff',
                  background: selected ? 'rgba(59,75,192,0.1)' : '#fff',
                  fontSize: 12,
                  fontWeight: selected ? 600 : 400,
                  cursor: existing ? 'default' : 'pointer',
                  opacity: !selected && selectedFactors.length >= 3 && !existing ? 0.7 : 1,
                }}
              >
                {factor}
              </button>
            );
          })}
        </div>

        {!existing && !isLocked && (
          <Button
            size="m"
            mode="primary"
            stretched
            style={{ marginTop: 16 }}
            loading={submitting}
            disabled={!answer.trim() || selectedFactors.length === 0}
            onClick={() => void handleSubmit()}
          >
            Отправить ответ
          </Button>
        )}
      </div>
    </Div>
  );
}
