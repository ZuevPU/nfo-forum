import {
  Button,
  Div,
  Group,
  SimpleCell,
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchReflectionQuestions,
  submitReflectionAnswer,
  type ReflectionQuestion,
} from '../api/reflection';
import { PanelLayout } from '../components/PanelLayout';

export function QuestionsPanel() {
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchReflectionQuestions()
      .then((r) => setQuestions(r.questions))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (q: ReflectionQuestion) => {
    const text = answers[q.id]?.trim();
    if (!text) return;
    await submitReflectionAnswer(q.id, text);
    load();
  };

  return (
    <PanelLayout id="questions" title="Вопросы" subtitle="Вопросы трека" loading={loading} error={error}>
      <Group>
        {questions.map((q) => (
          <Div key={q.id} style={{ padding: '8px 16px' }}>
            <div className="nfo-card" style={{ opacity: q.isLocked ? 0.6 : 1, margin: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-primary)', textTransform: 'uppercase', marginBottom: 6 }}>
                {q.isLocked ? q.unlockLabel ?? 'Заблокировано' : q.isAnswered ? 'Ответ отправлен' : `${q.points} баллов`}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, lineHeight: 1.4 }}>
                {q.isLocked ? '🔒 ' : q.isAnswered ? '✅ ' : ''}{q.text}
              </div>
              {!q.isLocked && !q.isAnswered && (
                <div>
                  <textarea
                    className="nfo-input"
                    rows={3}
                    placeholder="Твой ответ..."
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                  <Button size="m" stretched style={{ marginTop: 12 }} onClick={() => void handleSubmit(q)}>
                    Отправить
                  </Button>
                </div>
              )}
            </div>
          </Div>
        ))}
      </Group>
    </PanelLayout>
  );
}
