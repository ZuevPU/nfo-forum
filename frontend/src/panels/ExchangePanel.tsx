import {
  Div,
  Group,
  Panel,
  Placeholder,
  Spinner,
  PullToRefresh,
} from '@vkontakte/vkui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createExchangeQuestion,
  fetchExchangeFeed,
  fetchIncomingQuestions,
  formatExchangeAuthorName,
  formatExchangeAuthorTrack,
  type ExchangeFeedItem,
  type IncomingQuestion,
} from '../api/exchange';
import { useAuthContext } from '../contexts/AuthContext';
import { ExchangeIncomingCard } from '../components/ExchangeIncomingCard';
import { EmptyState } from '../components/EmptyState';
import { GradientHeader } from '../components/GradientHeader';
import { NotificationBell } from '../components/NotificationBell';

function getExchangeSubtitle(incomingCount: number): string {
  const hour = Number(
    new Intl.DateTimeFormat('ru-RU', { hour: 'numeric', hour12: false, timeZone: 'Europe/Moscow' }).format(new Date()),
  );
  if (hour >= 13 && hour < 14) {
    return 'Обед — время для обмена опытом';
  }
  if (incomingCount > 0) {
    const n = incomingCount;
    const word = n === 1 ? 'вопрос ждёт' : n < 5 ? 'вопроса ждут' : 'вопросов ждут';
    return `${n} ${word} твоего ответа`;
  }
  return 'Задай вопрос — участники ответят';
}

export function ExchangePanel() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [feed, setFeed] = useState<ExchangeFeedItem[]>([]);
  const [incoming, setIncoming] = useState<IncomingQuestion[]>([]);
  const [feedScope, setFeedScope] = useState<'all' | 'track'>('all');
  const [text, setText] = useState('');
  const [scope, setScope] = useState<'all' | 'track'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchExchangeFeed(feedScope), fetchIncomingQuestions()])
      .then(([f, i]) => {
        setFeed(f.feed);
        setIncoming(i.incoming);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [feedScope]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [feedScope]);

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

  const firstIncoming = incoming[0] ?? null;
  const restIncoming = incoming.slice(1);
  const subtitle = useMemo(() => getExchangeSubtitle(incoming.length), [incoming.length]);

  return (
    <Panel id="exchange">
      <GradientHeader title="Обмен опытом 💡" subtitle={subtitle} backToHome actions={<NotificationBell />} />

      <div className="nfo-exchange-intro">
        В течение дня здесь могут появляться вопросы от других участников программы. Ваш опыт и взгляд могут быть полезны коллегам, поэтому отвечайте на те вопросы, где вам есть чем поделиться.
      </div>

      <PullToRefresh onRefresh={() => load()} isFetching={loading}>
        <div className="nfo-bg">
          {firstIncoming && (
            <Group>
              <ExchangeIncomingCard question={firstIncoming} onDone={load} />
            </Group>
          )}

          <Group>
            <Div style={{ padding: '12px 16px' }}>
              <div className="nfo-ex-card">
                <div className="nfo-ex-lbl">Твой вопрос</div>
                <textarea
                  className="nfo-input"
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Напиши вопрос..."
                />
                <div className="nfo-scope-btns" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className={`nfo-scope-btn${scope === 'all' ? ' active' : ''}`}
                    onClick={() => setScope('all')}
                  >
                    Всем участникам
                  </button>
                  <button
                    type="button"
                    className={`nfo-scope-btn${scope === 'track' ? ' active' : ''}`}
                    onClick={() => setScope('track')}
                  >
                    Моему треку
                  </button>
                </div>
                <button
                  type="button"
                  className="nfo-ex-send"
                  disabled={submitting || !text.trim()}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? 'Отправка…' : 'Отправить вопрос'}
                </button>
              </div>
            </Div>
          </Group>

          {restIncoming.length > 0 && (
            <Group header={<div className="nfo-sec-title">Ещё ждут ответа</div>}>
              <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 12px' }}>
                {restIncoming.map((q) => (
                  <div
                    key={q.assignmentId}
                    className="nfo-ex-notify"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/exchange/incoming/${q.assignmentId}`)}
                  >
                    <div className="nfo-ex-notify-lbl">Ждёт твоего ответа</div>
                    <div className="nfo-ex-notify-q">{q.text}</div>
                    {(q.authorFirstName || q.authorTrack) && (
                      <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                        {formatExchangeAuthorName(q.authorFirstName, q.authorLastName)}
                        {q.authorTrack ? ` · ${formatExchangeAuthorTrack(q.authorTrack)}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </Div>
            </Group>
          )}

          {loading ? (
            <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Spinner size="l" />
            </Div>
          ) : error ? (
            <Placeholder>{error}</Placeholder>
          ) : (
            <Group header={<div className="nfo-sec-title">Лента вопросов</div>}>
              <Div style={{ padding: '0 16px 12px' }}>
                <div className="nfo-scope-btns">
                  <button
                    type="button"
                    className={`nfo-scope-btn${feedScope === 'all' ? ' active' : ''}`}
                    onClick={() => setFeedScope('all')}
                  >
                    Вопросы форума
                  </button>
                  <button
                    type="button"
                    className={`nfo-scope-btn${feedScope === 'track' ? ' active' : ''}`}
                    onClick={() => setFeedScope('track')}
                  >
                    Мой трек
                  </button>
                </div>
              </Div>
              <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 12px' }}>
                {feed.length === 0 ? (
                  <EmptyState
                    message={
                      feedScope === 'track' && !user?.track
                        ? 'Укажи трек в профиле, чтобы видеть вопросы своего направления'
                        : feedScope === 'track'
                          ? 'Пока нет вопросов от участников твоего трека'
                          : 'Пока никто не задал вопрос. Будь первым!'
                    }
                  />
                ) : feed.map((item) => (
                  <div
                    key={item.id}
                    className="nfo-ex-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/exchange/${item.id}`)}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>{item.text}</div>
                    {(item.authorFirstName || item.authorTrack) && (
                      <div style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 4 }}>
                        <div>{formatExchangeAuthorName(item.authorFirstName, item.authorLastName)}</div>
                        {item.authorTrack ? (
                          <div style={{ color: 'var(--vkui--color_text_secondary)' }}>
                            {formatExchangeAuthorTrack(item.authorTrack)}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)' }}>
                      {item.answerCount} ответов · {item.scopeLabel}
                      {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
                    </div>
                  </div>
                ))}
              </Div>
            </Group>
          )}
        </div>
      </PullToRefresh>
    </Panel>
  );
}
