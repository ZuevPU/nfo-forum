import {
  Button,
  Div,
  FormItem,
  Group,
  Panel,
  PanelHeader,
  Placeholder,
  SimpleCell,
  Spinner,
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createExchangeAnswer,
  fetchQuestionDetail,
  type QuestionDetail,
} from '../api/exchange';
import { PanelTitle } from '../components/PanelTitle';

export function ExchangeDetailPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchQuestionDetail(Number(id))
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnswer = async () => {
    if (!id || !answer.trim()) return;
    setSubmitting(true);
    try {
      await createExchangeAnswer(Number(id), answer.trim());
      setAnswer('');
      const updated = await fetchQuestionDetail(Number(id));
      setDetail(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const collected = detail && detail.answers.length >= 3;

  return (
    <Panel id="exchange-detail">
      <PanelHeader
        before={<Button mode="tertiary" onClick={() => navigate('/exchange')}>Назад</Button>}
      >
        <PanelTitle title="Вопрос" subtitle="Ответы участников" />
      </PanelHeader>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></Div>
      ) : error ? (
        <Placeholder>{error}</Placeholder>
      ) : detail ? (
        <>
          <Group>
            <SimpleCell multiline subtitle={detail.question.isMine ? 'Твой вопрос' : undefined}>
              {detail.question.text}
            </SimpleCell>
          </Group>
          {collected && (
            <Group>
              <Div style={{ textAlign: 'center', padding: 16, color: 'var(--nfo-green)' }}>
                ✓ Ответы собраны — {detail.answers.length} участников поделились опытом
              </Div>
            </Group>
          )}
          <Group header={`Ответы (${detail.answers.length})`}>
            <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 12px' }}>
            {detail.answers.length === 0 ? (
              <Placeholder>Пока нет ответов — будь первым!</Placeholder>
            ) : (
              detail.answers.map((a) => (
                <div key={a.id} className="nfo-card" style={{ margin: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>{a.answerText}</div>
                  <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)' }}>{new Date(a.createdAt).toLocaleString('ru-RU')}</div>
                </div>
              ))
            )}
            </Div>
          </Group>
          {!detail.question.isMine && (
            <Group>
              <Div style={{ padding: '0 16px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>Твой ответ</div>
                <textarea
                  className="nfo-input"
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Поделись опытом..."
                />
                <Button size="l" stretched loading={submitting} onClick={() => void handleAnswer()} style={{ marginTop: 12 }}>
                  Отправить ответ
                </Button>
              </Div>
            </Group>
          )}
        </>
      ) : null}
    </Panel>
  );
}
