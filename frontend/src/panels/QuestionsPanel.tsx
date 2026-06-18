import {
  Button,
  Div,
  Group,
} from '@vkontakte/vkui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchReflectionQuestions,
  fetchNfoDayConfig,
  submitReflectionAnswer,
  type NfoDayConfig,
  type ReflectionQuestion,
} from '../api/reflection';
import { PanelLayout } from '../components/PanelLayout';
import { NotificationBell } from '../components/NotificationBell';
import { CheckinSection } from '../components/CheckinSection';
import { NfoDaySection } from '../components/NfoDaySection';
import { ProgramInsightsSection } from '../components/ProgramInsightsSection';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  entry: 'Входной вопрос',
  daily: 'Вопрос дня',
  block: 'После блока',
  evening: 'Вечерняя рефлексия',
  final: 'Выходной вопрос',
  state: 'Состояние',
  track: 'Трек',
};

const QUESTION_TYPE_ORDER: Record<string, number> = {
  entry: 0,
  daily: 1,
  block: 2,
  evening: 3,
  state: 4,
  track: 5,
  final: 6,
};

function groupQuestions(questions: ReflectionQuestion[]) {
  const groups = questions.reduce((acc, q) => {
    const key = q.groupId || `single-${q.id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {} as Record<string, ReflectionQuestion[]>);

  return Object.entries(groups).sort(([, a], [, b]) => {
    const orderA = QUESTION_TYPE_ORDER[a[0]?.type ?? ''] ?? 99;
    const orderB = QUESTION_TYPE_ORDER[b[0]?.type ?? ''] ?? 99;
    return orderA - orderB;
  });
}

export function QuestionsPanel() {
  const { questionId } = useParams<{ questionId?: string }>();
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [nfoConfig, setNfoConfig] = useState<NfoDayConfig | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchReflectionQuestions(), fetchNfoDayConfig()])
      .then(([questionsRes, nfoRes]) => {
        setQuestions(questionsRes.questions);
        setNfoConfig(nfoRes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const questionGroups = useMemo(() => groupQuestions(questions), [questions]);

  useEffect(() => {
    if (!questionId || loading) return;
    const el = document.getElementById(`question-${questionId}`);
    if (!el) return;

    const frame = window.requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'center' });
      el.style.outline = '2px solid var(--nfo-primary)';
      el.style.borderRadius = '12px';
    });

    return () => {
      window.cancelAnimationFrame(frame);
      el.style.outline = '';
      el.style.borderRadius = '';
    };
  }, [questionId, loading, questions]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const handleSubmit = async (q: ReflectionQuestion) => {
    const text = answers[q.id]?.trim();
    if (!text) return;
    await submitReflectionAnswer(q.id, text);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });
    setSuccessMessage('Ответ сохранён');
    load();
  };

  const renderQuestionGroup = ([key, group]: [string, ReflectionQuestion[]]) => {
    const isGroup = group.length > 1;
    const allAnswered = group.every((q) => q.isAnswered && !q.allowMultiple);
    const anyLocked = group.some((q) => q.isLocked);
    const totalPoints = group.reduce((sum, q) => sum + q.points, 0);
    const unlockLabel = group.find((q) => q.isLocked)?.unlockLabel;
    const typeLabel = QUESTION_TYPE_LABELS[group[0]?.type ?? ''] ?? group[0]?.type;

    if (allAnswered && !anyLocked) {
      return (
        <Div key={key} style={{ padding: '8px 16px' }}>
          <div className="nfo-qdone">
            <span>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{typeLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--nfo-green)' }}>Ответ отправлен</div>
            </div>
          </div>
        </Div>
      );
    }

    return (
      <Div key={key} style={{ padding: '8px 16px' }}>
        <div className="nfo-qcard" style={{ opacity: anyLocked ? 0.6 : 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-primary)', textTransform: 'uppercase', marginBottom: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span>{typeLabel}</span>
            <span>·</span>
            <span>{anyLocked ? unlockLabel ?? 'Заблокировано' : allAnswered ? 'Ответ отправлен' : `${totalPoints} баллов`}</span>
          </div>

          {group.map((q, index) => (
            <div key={q.id} id={`question-${q.id}`} style={{ marginBottom: index === group.length - 1 ? 0 : 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>
                {anyLocked ? '🔒 ' : q.isAnswered ? '✅ ' : ''}{q.text}
              </div>
              {!anyLocked && (!q.isAnswered || q.allowMultiple) && (
                <div>
                  <textarea
                    className="nfo-input"
                    rows={2}
                    placeholder="Твой ответ..."
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                  {!isGroup && (
                    <Button size="m" mode="primary" stretched style={{ marginTop: 12 }} onClick={() => void handleSubmit(q)}>
                      Отправить
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {isGroup && !anyLocked && !allAnswered && (
            <Button
              size="m"
              mode="primary"
              stretched
              style={{ marginTop: 12 }}
              onClick={() => {
                void (async () => {
                  const pending = group.filter((q) => !q.isAnswered && answers[q.id]?.trim());
                  if (pending.length === 0) return;
                  for (const q of pending) {
                    await submitReflectionAnswer(q.id, answers[q.id].trim());
                  }
                  setAnswers((prev) => {
                    const next = { ...prev };
                    pending.forEach((q) => delete next[q.id]);
                    return next;
                  });
                  setSuccessMessage('Ответы сохранены');
                  load();
                })();
              }}
            >
              Отправить ответы
            </Button>
          )}
        </div>
      </Div>
    );
  };

  return (
    <PanelLayout
      id="questions"
      title="Вопросы"
      subtitle="Входной, чек-ины и вечерняя рефлексия"
      loading={loading}
      error={error}
      useGradient
      backToHome
      headerActions={<NotificationBell />}
    >
      {successMessage && (
        <Div style={{ padding: '8px 16px 0' }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: '#e8f8ef', color: '#1e7e34', fontSize: 13, fontWeight: 600 }}>
            ✅ {successMessage}
          </div>
        </Div>
      )}

      <Group header={<div className="nfo-sec-title">Чек-ин состояния</div>}>
        <CheckinSection
          key={refreshKey}
          showHistory={false}
          onSubmitted={() => setRefreshKey((k) => k + 1)}
        />
      </Group>

      {questionGroups.length > 0 && (
        <Group header={<div className="nfo-sec-title">Вопросы программы</div>}>
          {questionGroups.map(renderQuestionGroup)}
        </Group>
      )}

      <Group header={<div className="nfo-sec-title">Озарения и важные мысли</div>}>
        <ProgramInsightsSection />
      </Group>

      <Group
        header={
          <div>
            <div className="nfo-sec-title">{nfoConfig?.panelTitle ?? 'Каким было НФО сегодня?'}</div>
            {nfoConfig?.panelSubtitle ? (
              <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 2 }}>
                {nfoConfig.panelSubtitle}
              </div>
            ) : null}
          </div>
        }
      >
        <NfoDaySection onSubmitted={() => setRefreshKey((k) => k + 1)} />
      </Group>
    </PanelLayout>
  );
}
