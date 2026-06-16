import {
  Div,
  Group,
  Headline,
  SegmentedControl,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { fetchRating, type RatingData } from '../api/rating';
import { PanelLayout } from '../components/PanelLayout';

export function RatingPanel() {
  const [scope, setScope] = useState<'track' | 'all'>('track');
  const [data, setData] = useState<RatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRating(scope)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [scope]);

  return (
    <PanelLayout id="rating" title="Рейтинг" loading={loading} error={error}>
      {data && (
        <Group>
          <Div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Headline level="1" weight="1" style={{ fontSize: 36, color: 'var(--vkui--color_text_accent)' }}>
              {data.me.points}
            </Headline>
            <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)' }}>
              твои баллы · {data.me.trackRank} место в треке
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
    </PanelLayout>
  );
}
