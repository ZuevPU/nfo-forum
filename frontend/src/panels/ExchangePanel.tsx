import {
  Button,
  Div,
  FormItem,
  Group,
  Placeholder,
  SegmentedControl,
  SimpleCell,
  Spinner,
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createExchangeQuestion,
  fetchExchangeFeed,
  fetchIncomingQuestions,
  type ExchangeFeedItem,
  type IncomingQuestion,
} from '../api/exchange';
import { PanelLayout } from '../components/PanelLayout';

export function ExchangePanel() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<ExchangeFeedItem[]>([]);
  const [incoming, setIncoming] = useState<IncomingQuestion[]>([]);
  const [text, setText] = useState('');
  const [scope, setScope] = useState<'all' | 'track'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchExchangeFeed(), fetchIncomingQuestions()])
      .then(([f, i]) => {
        setFeed(f.feed);
        setIncoming(i.incoming);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await createExchangeQuestion(text.trim(), scope);
      setText('');
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelLayout id="exchange" title="Обмен опытом" subtitle="Задай вопрос — участники ответят">
      <Group>
        <FormItem top="Твой вопрос">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Напиши вопрос..." />
        </FormItem>
        <Div>
          <SegmentedControl
            value={scope}
            onChange={(v) => setScope(v as 'all' | 'track')}
            options={[
              { label: 'Всем участникам', value: 'all' },
              { label: 'Только моему треку', value: 'track' },
            ]}
          />
        </Div>
        <Div>
          <Button size="l" stretched loading={submitting} onClick={() => void handleSubmit()}>
            Отправить вопрос
          </Button>
        </Div>
      </Group>
      {incoming.length > 0 && (
        <Group header="Входящие вопросы">
          {incoming.map((q) => (
            <SimpleCell
              key={q.assignmentId}
              subtitle="Ждёт твоего ответа"
              multiline
              onClick={() => navigate(`/exchange/incoming/${q.assignmentId}`)}
              indicator={<span>›</span>}
            >
              {q.text}
            </SimpleCell>
          ))}
        </Group>
      )}
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="l" /></Div>
      ) : error ? (
        <Placeholder>{error}</Placeholder>
      ) : (
        <Group header="Лента вопросов">
          {feed.map((item) => (
            <SimpleCell
              key={item.id}
              subtitle={`${item.answerCount} ответов · ${item.scopeLabel}`}
              multiline
              onClick={() => navigate(`/exchange/${item.id}`)}
              indicator={<span>›</span>}
            >
              {item.text}
            </SimpleCell>
          ))}
        </Group>
      )}
    </PanelLayout>
  );
}
