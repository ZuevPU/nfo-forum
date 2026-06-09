import {
  Button,
  Div,
  FormItem,
  Group,
  Panel,
  PanelHeader,
  SimpleCell,
  Spinner,
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createExchangeAnswer, fetchIncomingQuestions, type IncomingQuestion } from '../api/exchange';
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
          <SimpleCell multiline subtitle="Ждёт твоего ответа">{question.text}</SimpleCell>
          <FormItem top="Твой ответ">
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </FormItem>
          <Div>
            <Button size="l" stretched loading={submitting} onClick={() => void handleSubmit()}>
              Отправить ответ
            </Button>
          </Div>
        </Group>
      ) : null}
    </Panel>
  );
}
