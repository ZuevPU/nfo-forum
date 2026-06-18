import {
  Button,
  Div,
  Group,
  Headline,
  Panel,
  PanelHeader,
  Textarea,
  Text,
} from '@vkontakte/vkui';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  fetchDiagnosticBlocks,
  fetchDiagnosticProgress,
  submitDiagnosticAnswer,
  completeDiagnosticAttempt,
  startNewDiagnosticAttempt,
  submitDiagnosticProfileFeedback,
  fetchDiagnosticProfileFeedback,
  type DiagnosticData,
  type DiagnosticAnswer,
} from '../api/diagnostics';
import { PanelLayout } from '../components/PanelLayout';
import { useAuthContext } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { Icon28DoneOutline } from '@vkontakte/icons';

export function DiagnosticsPanel() {
  const { user } = useAuthContext();
  const { setTabbarHidden } = useLayout();
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);
  
  const [activeSkillId, setActiveSkillId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedDetails, setExpandedDetails] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');
  const [profileFeedbackSaved, setProfileFeedbackSaved] = useState(false);
  const [profileFeedbackSubmitting, setProfileFeedbackSubmitting] = useState(false);
  const nextFooterRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setTabbarHidden(activeSkillId !== null);
    return () => setTabbarHidden(false);
  }, [activeSkillId, setTabbarHidden]);

  useEffect(() => {
    if (!user?.track) {
      setLoading(false);
      return;
    }
    setError(null);
    Promise.all([fetchDiagnosticBlocks(), fetchDiagnosticProgress()])
      .then(([blocksRes, progressRes]) => {
        setData(blocksRes.blocks);
        setAnswers(progressRes.progress);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [user]);

  const latestAttemptNumber = useMemo(() => {
    if (answers.length === 0) return 1;
    return Math.max(...answers.map(a => a.attemptNumber));
  }, [answers]);

  const currentAnswers = useMemo(() => {
    return answers.filter(a => a.attemptNumber === latestAttemptNumber);
  }, [answers, latestAttemptNumber]);

  const isCompleted = useMemo(() => {
    if (!data) return false;
    return data.skills.every(s => currentAnswers.some(a => a.blockId === s.id));
  }, [data, currentAnswers]);

  const currentSkillIndex = useMemo(() => {
    if (!data || !activeSkillId) return -1;
    return data.skills.findIndex(s => s.id === activeSkillId);
  }, [data, activeSkillId]);

  const handleStart = () => {
    if (isCompleted) {
      setShowProfile(true);
      void fetchDiagnosticProfileFeedback()
        .then((r) => {
          if (r.feedback?.comment) {
            setProfileFeedback(r.feedback.comment);
            setProfileFeedbackSaved(true);
          }
        })
        .catch(() => {});
    } else {
      const firstUnanswered = data?.skills.find(s => !currentAnswers.some(a => a.blockId === s.id));
      if (firstUnanswered) {
        setActiveSkillId(firstUnanswered.id);
      } else {
        setActiveSkillId(data?.skills[0]?.id || null);
      }
    }
  };

  const handleScore = async (score: number) => {
    if (!activeSkillId) return;
    const currentScoreData = currentAnswers.find(a => a.blockId === activeSkillId);
    
    // Optimistic update
    const newAnswer: DiagnosticAnswer = {
      id: currentScoreData?.id || Date.now(),
      userId: user!.id,
      blockId: activeSkillId,
      score,
      attemptNumber: latestAttemptNumber,
      comment: commentText,
      createdAt: new Date().toISOString(),
    };
    
    setAnswers(prev => {
      const idx = prev.findIndex(a => a.blockId === activeSkillId && a.attemptNumber === latestAttemptNumber);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newAnswer;
        return next;
      }
      return [...prev, newAnswer];
    });

    try {
      await submitDiagnosticAnswer(activeSkillId, 1, score, commentText);
    } catch (e) {
      console.error(e);
    }

    requestAnimationFrame(() => {
      nextFooterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    if (expandedDetails === null) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        void handleNextRef.current();
      }, 300);
    }
  };

  const handleNext = async () => {
    if (currentSkillIndex < 0 || !data) return;
    
    // Save comment before moving to next
    if (activeSkillId && commentText) {
      const currentScore = currentAnswers.find(a => a.blockId === activeSkillId)?.score;
      if (currentScore) {
        await submitDiagnosticAnswer(activeSkillId, 1, currentScore, commentText);
      }
    }

    if (currentSkillIndex === data.skills.length - 1) {
      if (isCompleted) {
        try {
          await completeDiagnosticAttempt();
        } catch (e) {
          console.error('Failed to complete', e);
        }
      }
      setActiveSkillId(null);
      setShowProfile(true);
    } else {
      setActiveSkillId(data.skills[currentSkillIndex + 1].id);
      setCommentText('');
      setExpandedDetails(null);
    }
  };

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  const handleStartNew = async () => {
    setLoading(true);
    try {
      await startNewDiagnosticAttempt();
      const progressRes = await fetchDiagnosticProgress();
      setAnswers(progressRes.progress);
      setShowProfile(false);
      setActiveSkillId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.track || error?.includes('available only for trainer tracks')) {
    return (
      <PanelLayout id="diagnostics" title="Самодиагностика" useGradient backToHome>
        <Div style={{ padding: 24, textAlign: 'center' }}>
          Доступно только для треков обучения тренеров
        </Div>
      </PanelLayout>
    );
  }

  if (loading || !data) {
    return (
      <PanelLayout id="diagnostics" title="Самодиагностика" loading={loading} error={error} useGradient backToHome>
        <div />
      </PanelLayout>
    );
  }

  if (showProfile) {
    return (
      <Panel id="diagnostics">
        <PanelHeader before={<Button mode="tertiary" onClick={() => setShowProfile(false)}>Назад</Button>}>
          Мой профиль
        </PanelHeader>
        <Group>
          <Div style={{ padding: 16 }}>
            <Headline level="2" style={{ marginBottom: 16 }}>Результаты</Headline>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.skills.map(skill => {
                const answer = currentAnswers.find(a => a.blockId === skill.id);
                const score = answer?.score || 0;
                const percent = (score / 5) * 100;
                
                return (
                  <div key={skill.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: 500 }}>{skill.title}</Text>
                      <Text style={{ fontSize: 13, fontWeight: 700, color: '#4f3ec0' }}>{score} / 5</Text>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#e1e3e6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #4f3ec0, #7b5ecf)' }} />
                    </div>
                    {answer && answer.score > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                        {data.interpretation_key[`Уровень ${answer.score}`]?.meaning || 'Нет интерпретации'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Div>
        </Group>
        <Group header={<Headline level="2" style={{ padding: '0 16px', margin: '8px 0' }}>Ключ интерпретации</Headline>}>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(data.interpretation_key).map(([key, info]) => (
              <div key={key} style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{key}: {info.label}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{info.meaning}</div>
              </div>
            ))}
          </Div>
        </Group>
        <Group header="Ваш комментарий">
          <Div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', marginBottom: 8, lineHeight: 1.45 }}>
              Насколько профиль соответствует вашему представлению о себе? Что удивило? Какие мысли появились?
            </div>
            <Textarea
              rows={4}
              value={profileFeedback}
              onChange={(e) => setProfileFeedback(e.target.value)}
              placeholder="Поделитесь впечатлениями..."
              disabled={profileFeedbackSaved}
            />
            {!profileFeedbackSaved ? (
              <Button
                size="l"
                stretched
                style={{ marginTop: 12 }}
                loading={profileFeedbackSubmitting}
                disabled={!profileFeedback.trim()}
                onClick={() => {
                  setProfileFeedbackSubmitting(true);
                  void submitDiagnosticProfileFeedback(profileFeedback.trim())
                    .then(() => setProfileFeedbackSaved(true))
                    .catch(console.error)
                    .finally(() => setProfileFeedbackSubmitting(false));
                }}
              >
                Отправить комментарий
              </Button>
            ) : (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--nfo-green)' }}>Спасибо, комментарий сохранён</div>
            )}
          </Div>
        </Group>
        <Div>
          <Button size="l" stretched onClick={() => void handleStartNew()} mode="secondary">
            Пройти заново
          </Button>
        </Div>
      </Panel>
    );
  }

  if (activeSkillId) {
    const activeSkill = data.skills.find(s => s.id === activeSkillId)!;
    const currentAnswer = currentAnswers.find(a => a.blockId === activeSkillId);

    return (
      <Panel id="diagnostics">
        <div style={{ background: 'linear-gradient(90deg, #4f3ec0, #7b5ecf)', padding: '16px 16px 24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <div onClick={() => setActiveSkillId(null)} style={{ padding: 8, margin: '-8px', cursor: 'pointer' }}>
              ✕
            </div>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
              Блок {currentSkillIndex + 1} из 9
            </div>
            <div style={{ width: 24 }} />
          </div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2, marginBottom: 16 }}>
            <div style={{ width: `${((currentSkillIndex + 1) / 9) * 100}%`, height: '100%', background: '#fff', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>{activeSkill.title}</div>
          <Headline level="2" style={{ fontWeight: 700 }}>{activeSkill.self_assessment_question}</Headline>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>{activeSkill.hint}</div>
        </div>

        <Group>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeSkill.levels.map((level) => {
              const isSelected = currentAnswer?.score === level.level;
              return (
                <div 
                  key={level.level}
                  onClick={() => handleScore(level.level)}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? '#4f3ec0' : '#e1e3e6'}`,
                    background: isSelected ? 'rgba(79, 62, 192, 0.05)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: isSelected ? '#4f3ec0' : '#000' }}>
                      {level.level}. {level.label}
                    </div>
                    {isSelected && <Icon28DoneOutline fill="#4f3ec0" width={24} height={24} />}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.4 }}>
                    {level.short_description}
                  </div>
                  
                  {expandedDetails === level.level ? (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e1e3e6', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {level.details}
                      <div 
                        onClick={(e) => { e.stopPropagation(); setExpandedDetails(null); }}
                        style={{ color: '#4f3ec0', fontWeight: 500, marginTop: 8, cursor: 'pointer' }}
                      >
                        Скрыть
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={(e) => { 
                        e.stopPropagation();
                        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
                        setExpandedDetails(level.level);
                      }}
                      style={{ color: '#4f3ec0', fontWeight: 500, marginTop: 8, cursor: 'pointer', fontSize: 13 }}
                    >
                      Подробнее
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Мои заметки (опционально)</div>
              <Textarea 
                value={commentText || currentAnswer?.comment || ''} 
                onChange={(e) => setCommentText(e.target.value)} 
                placeholder="Напишите здесь мысли или примеры..."
              />
            </div>
          </Div>
        </Group>
        
        <div className="nfo-diag-footer" ref={nextFooterRef}>
          {currentSkillIndex > 0 && (
            <Button size="l" mode="secondary" onClick={() => setActiveSkillId(data.skills[currentSkillIndex - 1].id)}>
              Назад
            </Button>
          )}
          <Button 
            size="l" 
            stretched 
            mode="primary"
            disabled={!currentAnswer} 
            onClick={() => void handleNext()}
          >
            {currentSkillIndex === data.skills.length - 1 ? 'Завершить' : 'Далее'}
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <PanelLayout
      id="diagnostics"
      title="Самодиагностика"
      subtitle={data.subtitle}
      useGradient
      backToHome
    >
      <Group>
        <Div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #4f3ec0, #7b5ecf)', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 40 }}>🎯</span>
          </div>
          <Headline level="1" style={{ marginBottom: 8 }}>{data.title}</Headline>
          <div style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 15, marginBottom: 24, lineHeight: 1.4 }}>
            Ответь на 9 вопросов, чтобы оценить свои тренерские компетенции и получить персональный профиль развития.
          </div>
          
          <Button 
            size="l" 
            stretched 
            mode="primary"
            onClick={handleStart}
          >
            {isCompleted ? 'Смотреть профиль' : (currentAnswers.length > 0 ? 'Продолжить опрос' : 'Начать опрос →')}
          </Button>
        </Div>
      </Group>

        <Group header={<Headline level="2" style={{ padding: '0 16px', margin: '8px 0' }}>Навыки</Headline>}>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.skills.map((b, i) => {
          const isAnswered = currentAnswers.some(a => a.blockId === b.id);
          return (
            <div 
              key={b.id} 
              className="nfo-card" 
              style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isAnswered ? 0.7 : 1 }} 
              onClick={() => setActiveSkillId(b.id)}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: isAnswered ? '#e1e3e6' : 'rgba(79, 62, 192, 0.1)', color: isAnswered ? '#818c99' : '#4f3ec0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                    {isAnswered ? 'Ответ сохранен' : 'Ожидает ответа'}
                  </div>
                </div>
              </div>
              <div style={{ color: 'var(--vkui--color_icon_tertiary)', fontSize: 20 }}>›</div>
            </div>
          );
        })}
        </Div>
      </Group>
    </PanelLayout>
  );
}