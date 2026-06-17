import {
  Button,
  Div,
  Group,
  Panel,
  PanelHeader,
  Spinner,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createExchangeAnswer, fetchIncomingQuestions, skipExchangeQuestion, type IncomingQuestion } from '../api/exchange';
import { PanelTitle } from '../components/PanelTitle';

export function ExchangeIncomingPanel() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<IncomingQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIncomingQuestions()
      .then((r) => {
        const q = r.incoming.find((i) => String(i.assignmentId) === assignmentId);
        setQuestion(q ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleSkip = async () => {
    if (!question) return;
    setSubmitting(true);
    try {
      await skipExchangeQuestion(question.assignmentId);
      navigate('/exchange');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || !answer.trim()) return;
    setSubmitting(true);
    try {
      await createExchangeAnswer(question.questionId, answer.trim());
      navigate('/exchange');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel id="exchange-incoming">
      <PanelHeader before={<Button mode="tertiary" onClick={() => navigate('/exchange')}>Назад</Button>}>
        <PanelTitle title="Входящий вопрос" subtitle="Ответь участнику" />
      </PanelHeader>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="l" /></Div>
      ) : question ? (
        <Group>
          <Div style={{ padding: '12px 16px' }}>
            <div className="nfo-card" style={{ margin: 0, borderLeft: '3px solid var(--nfo-accent)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-accent)', textTransform: 'uppercase', marginBottom: 6 }}>Ждёт твоего ответа</div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{question.text}</div>
            </div>
          </Div>
          <Div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>Твой ответ</div>
            <textarea
              className="nfo-input"
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </Div>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button size="l" stretched loading={submitting} onClick={() => void handleSubmit()}>
              Отправить ответ
            </Button>
            <Button size="l" mode="secondary" stretched loading={submitting} onClick={() => void handleSkip()}>
              Пропустить вопрос
            </Button>
          </Div>
        </Group>
      ) : (
        <Div style={{ padding: 24, textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
          Вопрос не найден
        </Div>
      )}
    </Panel>
  );
}
