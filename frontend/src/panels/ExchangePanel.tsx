import {
  Button,
  Div,
  Group,
  Placeholder,
  SegmentedControl,
  Spinner,
  PullToRefresh,
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
      <PullToRefresh onRefresh={() => load()} isFetching={loading}>
        <Group>
        <Div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>Твой вопрос</div>
          <textarea 
            className="nfo-input" 
            rows={3} 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Напиши вопрос..." 
          />
        </Div>
        <Div style={{ paddingTop: 0 }}>
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
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 12px' }}>
          {incoming.map((q) => (
            <div key={q.assignmentId} className="nfo-card" style={{ margin: 0, borderLeft: '3px solid var(--nfo-accent)' }} onClick={() => navigate(`/exchange/incoming/${q.assignmentId}`)}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--nfo-accent)', textTransform: 'uppercase', marginBottom: 4 }}>Ждёт твоего ответа</div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{q.text}</div>
            </div>
          ))}
          </Div>
        </Group>
      )}
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="l" /></Div>
      ) : error ? (
        <Placeholder>{error}</Placeholder>
      ) : (
        <Group header="Лента вопросов">
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 12px' }}>
          {feed.map((item) => (
            <div key={item.id} className="nfo-card" style={{ margin: 0 }} onClick={() => navigate(`/exchange/${item.id}`)}>
              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>{item.text}</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)' }}>{item.answerCount} ответов · {item.scopeLabel}</div>
            </div>
          ))}
          </Div>
        </Group>
      )}
      </PullToRefresh>
    </PanelLayout>
  );
}
