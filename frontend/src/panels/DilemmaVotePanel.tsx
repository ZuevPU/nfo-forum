import { Button, Div, FormItem, Group, Spinner, Textarea } from '@vkontakte/vkui';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PanelLayout } from '../components/PanelLayout';
import { fetchDilemmaDetail, voteDilemma, type DilemmaDetail } from '../api/dilemmas';
import { refreshParticipantSnapshot, navBadgesFromHome } from '../lib/participantSnapshot';
import { useLayout } from '../contexts/LayoutContext';
import { useAuthContext } from '../contexts/AuthContext';

export function DilemmaVotePanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setNavBadges } = useLayout();
  const { syncUser } = useAuthContext();
  const [detail, setDetail] = useState<DilemmaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<'a' | 'b' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await fetchDilemmaDetail(Number(id));
      setDetail(d);
      if (d.myChoice) setSelected(d.myChoice);
      if (d.myComment) setComment(d.myComment);
    } catch {
      navigate('/dilemmas', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { void load(); }, [load]);

  const handleVote = async () => {
    if (!selected || !id || submitting) return;
    setSubmitting(true);
    try {
      await voteDilemma(Number(id), selected, comment.trim() || undefined);
      void refreshParticipantSnapshot()
        .then((data) => { syncUser(data.user); setNavBadges(navBadgesFromHome(data)); })
        .catch(console.error);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка. Попробуй ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const backButton = (
    <Div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="nfo-admin-btn-outline"
        style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)' }}
        onClick={() => navigate('/dilemmas')}
      >
        ← К дилеммам
      </button>
    </Div>
  );

  if (loading) {
    return (
      <PanelLayout id="dilemma-vote" title="Дилемма" useGradient headerChildren={backButton}>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      </PanelLayout>
    );
  }

  if (!detail) return null;

  const alreadyVoted = !!detail.myChoice;

  return (
    <PanelLayout id="dilemma-vote" title="Дилемма" useGradient headerChildren={backButton}>
      <Group>
        <Div style={{ padding: '16px 16px 24px' }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--vkui--color_text_primary)',
              lineHeight: 1.4,
              marginBottom: 20,
            }}
          >
            {detail.text}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {(['a', 'b'] as const).map((opt) => {
              const label = opt === 'a' ? detail.optionA : detail.optionB;
              const isSelected = selected === opt;
              const pct = detail.results
                ? opt === 'a'
                  ? detail.results.percentA
                  : detail.results.percentB
                : null;
              return (
                <div
                  key={opt}
                  onClick={() => { if (!alreadyVoted) setSelected(opt); }}
                  style={{
                    position: 'relative',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? 'var(--nfo-primary)' : '#e0e0e0'}`,
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : '#fff',
                    cursor: alreadyVoted ? 'default' : 'pointer',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {pct !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${pct}%`,
                        background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0,0,0,0.04)',
                        transition: 'width 0.5s',
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: isSelected ? 600 : 400, fontSize: 14 }}>{label}</span>
                    {pct !== null && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--nfo-primary)', marginLeft: 8 }}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!alreadyVoted && (
            <FormItem style={{ padding: 0, marginBottom: 16 }}>
              <Textarea
                placeholder="Почему именно этот выбор? (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </FormItem>
          )}

          {alreadyVoted && detail.myComment && (
            <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', fontStyle: 'italic', marginBottom: 16 }}>
              Ваш комментарий: {detail.myComment}
            </div>
          )}

          {detail.results && (
            <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginBottom: 16, textAlign: 'center' }}>
              Всего проголосовало: {detail.results.total}
            </div>
          )}

          {!alreadyVoted ? (
            <Button
              size="l"
              mode="primary"
              stretched
              disabled={!selected || submitting}
              loading={submitting}
              onClick={() => void handleVote()}
            >
              Отправить голос
            </Button>
          ) : (
            <Button size="l" mode="secondary" stretched onClick={() => navigate('/dilemmas')}>
              Вернуться к списку
            </Button>
          )}
        </Div>
      </Group>
    </PanelLayout>
  );
}
