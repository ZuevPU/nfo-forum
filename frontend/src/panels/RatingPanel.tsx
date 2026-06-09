import {
  Avatar,
  Div,
  Group,
  Headline,
  SegmentedControl,
  SimpleCell,
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
        {data?.list.map((entry) => (
          <SimpleCell
            key={entry.id}
            before={
              <Avatar size={32} gradientColor={entry.isMe ? 'blue' : 'orange'}>
                {entry.firstName[0]}
              </Avatar>
            }
            after={<span style={{ fontWeight: 700, color: 'var(--vkui--color_text_accent)' }}>{entry.points}</span>}
            style={entry.isMe ? { border: '1.5px solid var(--vkui--color_stroke_accent)' } : undefined}
          >
            {entry.position}. {entry.firstName} {entry.lastName ?? ''}
          </SimpleCell>
        ))}
      </Group>
    </PanelLayout>
  );
}
