import {
  Button,
  Div,
  FormItem,
  Group,
  SimpleCell,
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchEveningQuestions,
  fetchNfoDayToday,
  submitNfoDayReflection,
  submitReflectionAnswer,
  type EveningQuestion,
} from '../api/reflection';
import { PanelLayout } from '../components/PanelLayout';

const NFO_FACTORS = [
  'Работа в направлении',
  'Общие образовательные блоки',
  'Выступления спикеров',
  'Практические занятия',
  'Работа в группе',
  'Общение с участниками',
  'Общение с модераторами',
  'Личные размышления',
  'Вопросы и рефлексия',
  'Атмосфера программы',
  'Внеформальное общение',
  'Истории других участников',
  'Задания программы',
  'Культурная программа',
  'Другое',
];

export function ReflectionPanel() {
  const [eveningQuestions, setEveningQuestions] = useState<EveningQuestion[]>([]);
  const [nfoAnswer, setNfoAnswer] = useState('');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [eveningAnswers, setEveningAnswers] = useState<Record<number, string>>({});
  const [nfoDone, setNfoDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([fetchEveningQuestions(), fetchNfoDayToday()])
      .then(([e, n]) => {
        setEveningQuestions(e.questions);
        setNfoDone(!!(n as { reflection: unknown }).reflection);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  const toggleFactor = (f: string) => {
    setSelectedFactors((prev) => {
      if (prev.includes(f)) {
        return prev.filter((x) => x !== f);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, f];
    });
  };

  const handleNfoSubmit = async () => {
    if (!nfoAnswer.trim() || !selectedFactors.length) return;
    await submitNfoDayReflection(nfoAnswer.trim(), selectedFactors);
    setNfoDone(true);
  };

  const handleEveningSubmit = async (q: EveningQuestion) => {
    const text = eveningAnswers[q.id]?.trim();
    if (!text) return;
    await submitReflectionAnswer(q.id, text);
    setEveningQuestions((prev) => prev.filter((x) => x.id !== q.id));
  };

  return (
    <PanelLayout id="reflection" title="Рефлексия" subtitle="Вечерняя рефлексия" loading={loading} error={error}>
      {!nfoDone && (
        <Group header="Что такое НФО для тебя?">
          <FormItem top="Твой ответ">
            <Textarea value={nfoAnswer} onChange={(e) => setNfoAnswer(e.target.value)} />
          </FormItem>
          <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px' }}>
            {NFO_FACTORS.map((f) => (
              <Button key={f} size="s" mode={selectedFactors.includes(f) ? 'primary' : 'secondary'} onClick={() => toggleFactor(f)}>
                {f}
              </Button>
            ))}
          </Div>
          <Div>
            <Button size="l" stretched onClick={() => void handleNfoSubmit()}>Сохранить</Button>
          </Div>
        </Group>
      )}
      {nfoDone && (
        <Group>
          <SimpleCell subtitle="Спокойной ночи! Завтра — новый день на Форуме НФО.">
            Рефлексия дня сохранена
          </SimpleCell>
        </Group>
      )}
      {eveningQuestions.length > 0 && (
        <Group header="Вечерние вопросы (19:30)">
          {eveningQuestions.map((q) => (
            <Div key={q.id} style={{ padding: '8px 16px' }}>
              <div className="nfo-card" style={{ margin: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, lineHeight: 1.4 }}>{q.text}</div>
                <textarea
                  className="nfo-input"
                  rows={3}
                  placeholder="Ваш ответ..."
                  value={eveningAnswers[q.id] ?? ''}
                  onChange={(e) => setEveningAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
                <Button size="m" stretched style={{ marginTop: 12 }} onClick={() => void handleEveningSubmit(q)}>
                  Ответить
                </Button>
              </div>
            </Div>
          ))}
        </Group>
      )}
    </PanelLayout>
  );
}
