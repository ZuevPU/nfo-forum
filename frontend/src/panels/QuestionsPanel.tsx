import {
  Button,
  Div,
  Group,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchReflectionQuestions,
  submitReflectionAnswer,
  type ReflectionQuestion,
} from '../api/reflection';
import { PanelLayout } from '../components/PanelLayout';
import { EmptyState } from '../components/EmptyState';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  entry: 'Входной',
  daily: 'Вопрос дня',
  block: 'После блока',
  evening: 'Вечерний',
  final: 'Итоговый',
  state: 'Состояние',
  track: 'Трек',
};

export function QuestionsPanel() {
  const { questionId } = useParams<{ questionId?: string }>();
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchReflectionQuestions()
      .then((r) => setQuestions(r.questions))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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

  return (
    <PanelLayout id="questions" title="Активные вопросы" subtitle="Вопросы трека" loading={loading} error={error} useGradient backToHome>
      {successMessage && (
        <Div style={{ padding: '8px 16px 0' }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: '#e8f8ef', color: '#1e7e34', fontSize: 13, fontWeight: 600 }}>
            ✅ {successMessage}
          </div>
        </Div>
      )}
      <Group header={<div className="nfo-sec-title">Вопросы трека</div>}>
        {questions.length === 0 ? (
          <EmptyState message="Вопросов пока нет. Загляни позже" />
        ) : Object.entries(
          questions.reduce((acc, q) => {
            const key = q.groupId || `single-${q.id}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(q);
            return acc;
          }, {} as Record<string, ReflectionQuestion[]>)
        ).map(([key, group]) => {
          const isGroup = group.length > 1;
          const allAnswered = group.every((q) => q.isAnswered);
          const anyLocked = group.some((q) => q.isLocked);
          const totalPoints = group.reduce((sum, q) => sum + q.points, 0);
          const unlockLabel = group.find((q) => q.isLocked)?.unlockLabel;

          if (allAnswered && !anyLocked) {
            return (
              <Div key={key} style={{ padding: '8px 16px' }}>
                <div className="nfo-qdone">
                  <span>✅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{QUESTION_TYPE_LABELS[group[0]?.type ?? ''] ?? group[0]?.type}</div>
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
                  <span>{QUESTION_TYPE_LABELS[group[0]?.type ?? ''] ?? group[0]?.type}</span>
                  <span>·</span>
                  <span>{anyLocked ? unlockLabel ?? 'Заблокировано' : allAnswered ? 'Ответ отправлен' : `${totalPoints} баллов`}</span>
                </div>
                
                {group.map((q, index) => (
                  <div key={q.id} id={`question-${q.id}`} style={{ marginBottom: index === group.length - 1 ? 0 : 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>
                      {anyLocked ? '🔒 ' : q.isAnswered ? '✅ ' : ''}{q.text}
                    </div>
                    {!anyLocked && !q.isAnswered && (
                      <div>
                        <textarea
                          className="nfo-input"
                          rows={2}
                          placeholder="Твой ответ..."
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        />
                        {!isGroup && (
                          <Button size="m" stretched style={{ marginTop: 12 }} onClick={() => void handleSubmit(q)}>
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
        })}
      </Group>
    </PanelLayout>
  );
}
