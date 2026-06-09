import {
  Button,
  Div,
  Group,
  Headline,
  Panel,
  PanelHeader,
  SimpleCell,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import {
  fetchDiagnosticBlocks,
  submitDiagnosticAnswer,
  type DiagnosticBlock,
} from '../api/diagnostics';
import { PanelLayout } from '../components/PanelLayout';
import { PanelTitle } from '../components/PanelTitle';
import { useAuthContext } from '../contexts/AuthContext';

const TRAINER_TRACKS = [
  'Обучение тренеров',
  'Аттестация тренеров',
  'Действующий состав АТ РСМ',
];

export function DiagnosticsPanel() {
  const { user } = useAuthContext();
  const [blocks, setBlocks] = useState<DiagnosticBlock[]>([]);
  const [activeBlock, setActiveBlock] = useState<DiagnosticBlock | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<{ id: number; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTrainer = user?.track && TRAINER_TRACKS.includes(user.track);

  useEffect(() => {
    if (!isTrainer) {
      setLoading(false);
      return;
    }
    setError(null);
    fetchDiagnosticBlocks()
      .then((r) => setBlocks(r.blocks))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [isTrainer]);

  const handleScore = async (score: number) => {
    if (!activeBlock || !activeQuestion) return;
    await submitDiagnosticAnswer(activeBlock.id, activeQuestion.id, score);
    setActiveQuestion(null);
  };

  if (!isTrainer) {
    return (
      <PanelLayout id="diagnostics" title="Самодиагностика">
        <Div style={{ padding: 24, textAlign: 'center' }}>
          Доступно только для треков обучения тренеров
        </Div>
      </PanelLayout>
    );
  }

  if (activeQuestion && activeBlock) {
    return (
      <Panel id="diagnostics">
        <PanelHeader><PanelTitle title="Вопрос" subtitle={activeBlock.title} /></PanelHeader>
        <Group>
          <Div style={{ padding: 16 }}>
            <Headline level="2">{activeQuestion.text}</Headline>
            <Div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Button key={s} size="l" onClick={() => void handleScore(s)}>{s}</Button>
              ))}
            </Div>
            <Button size="m" mode="secondary" style={{ marginTop: 12 }} onClick={() => setActiveQuestion(null)}>
              Назад
            </Button>
          </Div>
        </Group>
      </Panel>
    );
  }

  if (activeBlock) {
    return (
      <Panel id="diagnostics">
        <PanelHeader>{activeBlock.title}</PanelHeader>
        <Group>
          {activeBlock.questions.map((q) => (
            <SimpleCell key={q.id} onClick={() => setActiveQuestion(q)} indicator="›">
              {q.text}
            </SimpleCell>
          ))}
        </Group>
        <Div>
          <Button size="m" mode="secondary" onClick={() => setActiveBlock(null)}>К блокам</Button>
        </Div>
      </Panel>
    );
  }

  return (
    <PanelLayout
      id="diagnostics"
      title="Самодиагностика"
      subtitle="Оцени свои компетенции"
      loading={loading}
      error={error}
    >
      <Group>
        {blocks.map((b) => (
          <SimpleCell key={b.id} onClick={() => setActiveBlock(b)} indicator="›" multiline>
            {b.title}
            <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
              {b.questions.length} вопросов
            </div>
          </SimpleCell>
        ))}
      </Group>
    </PanelLayout>
  );
}
