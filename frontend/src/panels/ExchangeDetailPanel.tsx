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
            {detail.answers.length === 0 ? (
              <Placeholder>Пока нет ответов — будь первым!</Placeholder>
            ) : (
              detail.answers.map((a) => (
                <SimpleCell
                  key={a.id}
                  subtitle={new Date(a.createdAt).toLocaleString('ru-RU')}
                  multiline
                >
                  {a.answerText}
                </SimpleCell>
              ))
            )}
          </Group>
          {!detail.question.isMine && (
            <Group>
              <FormItem top="Твой ответ">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Поделись опытом..."
                />
              </FormItem>
              <Div>
                <Button size="l" stretched loading={submitting} onClick={() => void handleAnswer()}>
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
