import { Button, Div, Spinner } from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchNfoDayConfig,
  fetchNfoDayToday,
  submitNfoDayReflection,
  type NfoDayConfig,
  type NfoDayReflection,
} from '../api/reflection';
import { DEFAULT_NFO_DAY_QUESTIONS } from '../constants/nfoFactors';

interface NfoDaySectionProps {
  onSubmitted?: () => void;
}

export function NfoDaySection({ onSubmitted }: NfoDaySectionProps) {
  const [config, setConfig] = useState<NfoDayConfig | null>(null);
  const [existing, setExisting] = useState<NfoDayReflection | null>(null);
  const [thesis, setThesis] = useState('');
  const [understanding, setUnderstanding] = useState('');
  const [extra, setExtra] = useState('');
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
        const responses = today.reflection?.responses;
        if (responses) {
          setThesis(String(responses.thesis ?? today.reflection?.answerText ?? ''));
          setUnderstanding(String(responses.understanding ?? ''));
          setExtra(String(responses.extra ?? ''));
          setSelectedFactors(Array.isArray(responses.factors) ? responses.factors : today.reflection?.factors ?? []);
        } else if (today.reflection) {
          setThesis(today.reflection.answerText);
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
    if (!thesis.trim() || !understanding.trim() || selectedFactors.length === 0) return;
    setSubmitting(true);
    try {
      await submitNfoDayReflection({
        thesis: thesis.trim(),
        understanding: understanding.trim(),
        factors: selectedFactors,
        extra: extra.trim() || undefined,
      });
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
  const questions = config?.questions ?? DEFAULT_NFO_DAY_QUESTIONS;
  const isLocked = config && config.isOpen === false && !existing;
  const thesisQ = questions.find((q) => q.id === 'thesis') ?? questions[0];
  const understandingQ = questions.find((q) => q.id === 'understanding') ?? questions[1];
  const factorsQ = questions.find((q) => q.id === 'factors') ?? questions[2];
  const extraQ = questions.find((q) => q.id === 'extra') ?? questions[3];

  return (
    <Div style={{ padding: '8px 16px 12px' }}>
      <div className="nfo-qcard" style={{ opacity: isLocked ? 0.6 : 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-primary)', textTransform: 'uppercase', marginBottom: 6 }}>
          {existing ? '✅ Отвечено' : isLocked ? `🔒 Откроется в ${String(config?.publishHour ?? 19).padStart(2, '0')}:${String(config?.publishMinute ?? 0).padStart(2, '0')}` : `${config?.points ?? 10} баллов`}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>
          {thesisQ.label}
        </div>
        <textarea className="nfo-input" rows={3} value={thesis} readOnly={!!existing || !!isLocked} onChange={(e) => setThesis(e.target.value)} />

        <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
          {understandingQ.label}
        </div>
        <textarea className="nfo-input" rows={3} value={understanding} readOnly={!!existing || !!isLocked} onChange={(e) => setUnderstanding(e.target.value)} />

        <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
          {factorsQ.label} (до 3) · выбрано {selectedFactors.length}/3
        </div>
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
                }}
              >
                {factor}
              </button>
            );
          })}
        </div>

        {extraQ ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, margin: '16px 0 8px', color: 'var(--vkui--color_text_secondary)' }}>
              {extraQ.label}
            </div>
            <textarea className="nfo-input" rows={2} value={extra} readOnly={!!existing || !!isLocked} onChange={(e) => setExtra(e.target.value)} />
          </>
        ) : null}

        {!existing && !isLocked && (
          <Button
            size="m"
            mode="primary"
            stretched
            style={{ marginTop: 16 }}
            loading={submitting}
            disabled={!thesis.trim() || !understanding.trim() || selectedFactors.length === 0}
            onClick={() => void handleSubmit()}
          >
            Отправить ответ
          </Button>
        )}
      </div>
    </Div>
  );
}
