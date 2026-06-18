import { Button, Div, FormItem, Spinner, Textarea } from '@vkontakte/vkui';
import { useCallback, useEffect, useState } from 'react';
import { fetchFeedbackThread, submitFeedback, type FeedbackThreadItem } from '../api/home';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FeedbackOrganizersContent() {
  const [messages, setMessages] = useState<FeedbackThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return fetchFeedbackThread()
      .then((r) => setMessages(r.messages))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!feedbackText.trim()) return;
    setSubmitting(true);
    try {
      await submitFeedback(feedbackText.trim());
      setFeedbackText('');
      await load();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.45, marginBottom: 12 }}>
        Здесь — ваши обращения и ответы организаторов. Новое сообщение появится в ленте после отправки.
      </div>

      {loading ? (
        <Div style={{ textAlign: 'center', padding: 24 }}>
          <Spinner size="m" />
        </Div>
      ) : messages.length === 0 ? (
        <Div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.45 }}>
          Пока нет сообщений. Напишите первое обращение ниже.
        </Div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {[...messages].reverse().map((m) => (
            <div key={m.id}>
              <div className="nfo-card" style={{ margin: 0, background: '#f5f6ff' }}>
                <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginBottom: 4 }}>
                  Вы · {formatTime(m.createdAt)}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.text}</div>
              </div>
              {m.replies.map((r) => (
                <div
                  key={r.id}
                  className="nfo-card"
                  style={{ margin: '8px 0 0 12px', background: '#eefbf3', borderLeft: '3px solid #27ae60' }}
                >
                  <div style={{ fontSize: 11, color: '#27ae60', marginBottom: 4 }}>
                    {`${r.adminFirstName} ${r.adminLastName ?? ''}`.trim()} · организатор · {formatTime(r.createdAt)}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{r.text}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <FormItem top="Новое сообщение">
        <Textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Напиши вопрос или предложение..."
        />
      </FormItem>
      <Div>
        <Button size="l" mode="primary" stretched loading={submitting} onClick={() => void handleSubmit()}>
          Отправить
        </Button>
      </Div>
    </>
  );
}
