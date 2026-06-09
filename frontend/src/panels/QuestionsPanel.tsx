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
          <Div key={q.id} style={{ padding: '8px 0' }}>
            <SimpleCell
              disabled={q.isLocked || q.isAnswered}
              subtitle={q.isLocked ? q.unlockLabel ?? 'Заблокировано' : q.isAnswered ? 'Ответ отправлен' : `${q.points} баллов`}
              multiline
            >
              {q.isLocked ? '🔒 ' : q.isAnswered ? '✅ ' : ''}{q.text}
            </SimpleCell>
            {!q.isLocked && !q.isAnswered && (
              <Div>
                <Textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Твой ответ..."
                />
                <Button size="m" stretched style={{ marginTop: 8 }} onClick={() => void handleSubmit(q)}>
                  Отправить
                </Button>
              </Div>
            )}
          </Div>
        ))}
      </Group>
    </PanelLayout>
  );
}
