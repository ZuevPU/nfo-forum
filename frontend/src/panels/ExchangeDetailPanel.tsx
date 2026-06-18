import {
  Button,
  Div,
  Group,
  Panel,
  PanelHeader,
  Placeholder,
  SimpleCell,
  Spinner,
  IconButton,
} from '@vkontakte/vkui';
import { Icon28LikeOutline } from '@vkontakte/icons';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createExchangeAnswer,
  fetchQuestionDetail,
  addReaction,
  reportExchangeAnswer,
  formatExchangeAuthorName,
  formatExchangeAuthorTrack,
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

  const reload = async () => {
    if (!id) return;
    const updated = await fetchQuestionDetail(Number(id));
    setDetail(updated);
  };

  const handleAnswer = async () => {
    if (!id || !answer.trim()) return;
    setSubmitting(true);
    try {
      await createExchangeAnswer(Number(id), answer.trim());
      setAnswer('');
      await reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (answerId: number) => {
    try {
      await reportExchangeAnswer(answerId);
      window.alert('Жалоба отправлена модераторам');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReaction = async (answerId: number, reactionType: 'like' | 'discuss') => {
    try {
      await addReaction(answerId, reactionType);
      await reload();
    } catch (e) {
      console.error(e);
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
            <SimpleCell
              multiline
              subtitle={[
                detail.question.scopeLabel,
                detail.question.publishTime
                  ? new Date(detail.question.publishTime).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : null,
                detail.question.isMine ? 'Твой вопрос' : null,
              ].filter(Boolean).join(' · ')}
            >
              {detail.question.text}
            </SimpleCell>
            {!detail.question.isMine && (detail.question.authorFirstName || detail.question.authorTrack) ? (
              <Div style={{ padding: '0 16px 12px', fontSize: 12, lineHeight: 1.4 }}>
                <div>{formatExchangeAuthorName(detail.question.authorFirstName, detail.question.authorLastName)}</div>
                {detail.question.authorTrack ? (
                  <div style={{ color: 'var(--vkui--color_text_secondary)' }}>
                    {formatExchangeAuthorTrack(detail.question.authorTrack)}
                  </div>
                ) : null}
              </Div>
            ) : null}
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
                  {!a.isMine && (a.authorFirstName || a.authorTrack) ? (
                    <div style={{ fontSize: 12, lineHeight: 1.35, marginBottom: 6 }}>
                      <div style={{ fontWeight: 600 }}>{formatExchangeAuthorName(a.authorFirstName, a.authorLastName)}</div>
                      {a.authorTrack ? (
                        <div style={{ color: 'var(--vkui--color_text_secondary)' }}>
                          {formatExchangeAuthorTrack(a.authorTrack)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>{a.answerText}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)' }}>{new Date(a.createdAt).toLocaleString('ru-RU')}</div>
                    {!a.isMine && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button mode="tertiary" size="s" onClick={() => void handleReport(a.id)}>Пожаловаться</Button>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <IconButton
                            onClick={() => void handleReaction(a.id, 'like')}
                            style={{ opacity: a.likedByMe ? 1 : 0.6 }}
                          >
                            <Icon28LikeOutline width={20} height={20} fill={a.likedByMe ? 'var(--nfo-accent)' : undefined} />
                          </IconButton>
                          {a.likeCount > 0 && (
                            <span style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>{a.likeCount}</span>
                          )}
                        </div>
                        <Button
                          mode={a.discussedByMe ? 'primary' : 'outline'}
                          size="s"
                          onClick={() => void handleReaction(a.id, 'discuss')}
                        >
                          💬 Хочу обсудить{a.discussCount > 0 ? ` (${a.discussCount})` : ''}
                        </Button>
                      </div>
                    )}
                  </div>
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
                <Button size="l" mode="primary" stretched loading={submitting} onClick={() => void handleAnswer()} style={{ marginTop: 12 }}>
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
