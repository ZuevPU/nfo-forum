import { Button, Div, FormItem, Textarea } from '@vkontakte/vkui';
import { useCallback, useEffect, useState } from 'react';
import { fetchInsightsConfig, fetchProgramInsights, submitProgramInsight, type ProgramInsight } from '../api/reflection';

export function ProgramInsightsSection() {
  const [insights, setInsights] = useState<ProgramInsight[]>([]);
  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchProgramInsights(), fetchInsightsConfig()])
      .then(([insightsRes, config]) => {
        setInsights(insightsRes.insights);
        setPrompt(config.prompt);
        setPlaceholder(config.placeholder);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await submitProgramInsight(text.trim());
      setText('');
      setMessage(result.pointsAwarded > 0 ? `+${result.pointsAwarded} баллов рефлексии` : 'Запись сохранена');
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Div style={{ padding: '8px 16px 12px' }}>
      {prompt && (
        <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.45, marginBottom: 12 }}>
          {prompt}
        </div>
      )}
      <FormItem top="Озарение / важная мысль">
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      </FormItem>
      <Button size="m" mode="primary" stretched loading={submitting} disabled={!text.trim()} onClick={() => void handleSubmit()}>
        Сохранить
      </Button>
      {message && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--nfo-green)', fontWeight: 600 }}>{message}</div>
      )}
      {!loading && insights.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vkui--color_text_secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
            Ваши записи
          </div>
          {insights.map((item) => (
            <div key={item.id} style={{ padding: '10px 12px', background: '#f2f3f9', borderRadius: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{item.text}</div>
              <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 6 }}>
                {new Date(item.createdAt).toLocaleString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}
    </Div>
  );
}
