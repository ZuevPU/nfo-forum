import { Button, Div, Group, Spinner } from '@vkontakte/vkui';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLayout } from '../components/PanelLayout';
import { EmptyState } from '../components/EmptyState';
import { fetchDilemmas, type DilemmaItem } from '../api/dilemmas';
import { refreshParticipantSnapshot, navBadgesFromHome } from '../lib/participantSnapshot';
import { useLayout } from '../contexts/LayoutContext';
import { useAuthContext } from '../contexts/AuthContext';

function statusBadge(status: DilemmaItem['status']) {
  if (status === 'answered') {
    return (
      <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: '#27ae60', color: '#fff', fontSize: 10, fontWeight: 600 }}>
        Отвечено
      </div>
    );
  }
  if (status === 'new') {
    return (
      <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: 'var(--nfo-primary)', color: '#fff', fontSize: 10, fontWeight: 600 }}>
        Новая
      </div>
    );
  }
  return (
    <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: '#95a5a6', color: '#fff', fontSize: 10, fontWeight: 600 }}>
      Скоро
    </div>
  );
}

export function DilemmasPanel() {
  const navigate = useNavigate();
  const { setNavBadges } = useLayout();
  const { syncUser } = useAuthContext();
  const [items, setItems] = useState<DilemmaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchDilemmas()
      .then((r) => setItems(r.dilemmas))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    void refreshParticipantSnapshot()
      .then((data) => { syncUser(data.user); setNavBadges(navBadgesFromHome(data)); })
      .catch(console.error);
  }, [syncUser, setNavBadges]);

  const backButton = (
    <Div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="nfo-admin-btn-outline"
        style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)' }}
        onClick={() => navigate('/tasks')}
      >
        ← К заданиям
      </button>
    </Div>
  );

  return (
    <PanelLayout id="dilemmas" title="Море или горы в НФО" useGradient headerChildren={backButton}>
      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      ) : items.length === 0 ? (
        <EmptyState message="Дилеммы скоро появятся — следи за уведомлениями" />
      ) : (
        <Group>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
            {items.map((item) => (
              <div
                key={item.id}
                className="nfo-card"
                style={{ margin: 0, opacity: item.status === 'soon' ? 0.6 : 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vkui--color_text_primary)', flex: 1, marginRight: 8 }}>
                    {item.text}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)', whiteSpace: 'nowrap' }}>
                    {item.pointsPerVote} б.
                  </div>
                </div>
                {item.status === 'answered' && item.myChoice && (
                  <div style={{ fontSize: 12, color: '#27ae60', marginBottom: 6 }}>
                    Ваш выбор: <strong>{item.myChoice === 'a' ? item.optionA : item.optionB}</strong>
                  </div>
                )}
                {item.status === 'soon' && (
                  <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginBottom: 6 }}>
                    Появится {new Date(item.publishedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {statusBadge(item.status)}
                  {item.status !== 'soon' && (
                    <Button
                      size="s"
                      mode={item.status === 'answered' ? 'secondary' : 'primary'}
                      onClick={() => navigate(`/dilemmas/${item.id}`)}
                    >
                      {item.status === 'answered' ? 'Посмотреть результаты' : 'Ответить'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Div>
        </Group>
      )}
    </PanelLayout>
  );
}
