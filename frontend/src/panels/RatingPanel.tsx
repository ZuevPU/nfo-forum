import {
  Div,
  Group,
  SegmentedControl,
  Title,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { fetchPointsHistory, fetchRating, type PointsHistoryItem, type RatingData } from '../api/rating';
import { REFLECTION_LEVEL_NAMES } from '../constants/nfoFactors';
import { PanelLayout } from '../components/PanelLayout';
import { ProgressBar } from '../components/ProgressBar';

const REFLECTION_THRESHOLDS = [0, 30, 70, 120, 200];

export function RatingPanel() {
  const [scope, setScope] = useState<'track' | 'all'>('track');
  const [data, setData] = useState<RatingData | null>(null);
  const [history, setHistory] = useState<PointsHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchRating(scope), fetchPointsHistory()])
      .then(([rating, hist]) => {
        setData(rating);
        setHistory(hist.history);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [scope]);

  const me = data?.me;
  const reflectionProgress = me
    ? me.reflectionLevel >= 5
      ? 100
      : ((me.reflectionPoints - REFLECTION_THRESHOLDS[me.reflectionLevel - 1]) /
          (REFLECTION_THRESHOLDS[me.reflectionLevel] - REFLECTION_THRESHOLDS[me.reflectionLevel - 1])) *
        100
    : 0;

  return (
    <PanelLayout id="rating" title="Рейтинг" subtitle="Мой трек и общий зачёт" loading={loading} error={error} useGradient backToHome>
      {data && me && (
        <Group>
          <Div style={{ padding: '12px 16px' }}>
            <div className="nfo-card nfo-rating-me" style={{ margin: 0 }}>
              <Title level="2" style={{ color: 'var(--nfo-primary)' }}>{me.points}</Title>
              <div className="nfo-rating-me-label">твои баллы</div>
              <div className="nfo-rating-me-rank">{me.trackRank} место в треке</div>
              <div style={{ marginTop: 12, width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Ур. {me.reflectionLevel} — {REFLECTION_LEVEL_NAMES[me.reflectionLevel] ?? ''}
                </div>
                <ProgressBar value={reflectionProgress} max={100} />
                {me.nextLevelPoints != null && (
                  <div style={{ fontSize: 11, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                    {me.nextLevelPoints - me.reflectionPoints} б. до след. уровня
                  </div>
                )}
              </div>
            </div>
          </Div>
        </Group>
      )}
      <Group>
        <Div>
          <SegmentedControl
            value={scope}
            onChange={(v) => setScope(v as 'track' | 'all')}
            options={[
              { label: 'Мой трек', value: 'track' },
              { label: 'Все', value: 'all' },
            ]}
          />
        </Div>
      </Group>
      <Group>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 16px 12px' }}>
        {data?.list.map((entry) => (
          <div key={entry.id} className="nfo-card" style={{ margin: 0, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12, border: entry.isMe ? '1.5px solid var(--nfo-primary)' : undefined }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)', minWidth: 16 }}>{entry.position}.</div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: entry.isMe ? 'var(--nfo-primary)' : '#e8eaff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: entry.isMe ? '#fff' : 'var(--nfo-primary)' }}>
              {entry.firstName[0]}
            </div>
            <div style={{ flex: 1, fontSize: 12, fontWeight: entry.isMe ? 700 : 500, color: entry.isMe ? 'var(--nfo-primary)' : 'inherit' }}>
              {entry.firstName} {entry.lastName ?? ''}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)' }}>{entry.points}</div>
          </div>
        ))}
        </Div>
      </Group>
      {history.length > 0 && (
        <Group header="История баллов">
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 16px 12px' }}>
            {history.map((h) => (
              <div key={h.id} className="nfo-card" style={{ margin: 0, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: h.points >= 0 ? '#27ae60' : '#e74c3c' }}>
                    {h.points >= 0 ? '+' : ''}{h.points} б.
                  </span>
                  <span style={{ color: 'var(--vkui--color_text_secondary)' }}>
                    {new Date(h.createdAt).toLocaleString('ru-RU')}
                  </span>
                </div>
                <div style={{ marginTop: 4, color: 'var(--vkui--color_text_secondary)' }}>{h.source}{h.comment ? ` · ${h.comment}` : ''}</div>
              </div>
            ))}
          </Div>
        </Group>
      )}
    </PanelLayout>
  );
}
