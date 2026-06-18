import { Div, Footnote, Headline } from '@vkontakte/vkui';
import type { EventDto } from '../api/home';

interface Props {
  event: EventDto | null;
}

export function CurrentBlockCard({ event }: Props) {
  if (!event) return null;

  const time = new Date(event.startTime).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Div
      className="nfo-gradient-green"
      style={{ borderRadius: 12, margin: '0 12px', padding: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="nfo-pulse-dot" />
        <Footnote style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
          Сейчас в программе
        </Footnote>
      </div>
      <Headline level="2" weight="2" style={{ color: '#fff', marginTop: 4 }}>
        {event.title}
      </Headline>
      {event.place && (
        <Footnote style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          {event.place}
          {event.track ? ` · ${event.track}` : ''}
        </Footnote>
      )}
      <Footnote style={{ color: 'var(--nfo-accent)', fontWeight: 600, marginTop: 4 }}>{time}</Footnote>
    </Div>
  );
}
