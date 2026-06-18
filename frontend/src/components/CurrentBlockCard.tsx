import { Div, Footnote, Headline } from '@vkontakte/vkui';
import type { EventDto } from '../api/home';
import { CharacterIllustration } from './CharacterIllustration';
import { MASCOT_IMAGES } from '../constants/mascotImages';

interface Props {
  event: EventDto | null;
}

export function CurrentBlockCard({ event }: Props) {
  if (!event) return null;

  const time = new Date(event.startTime).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const hasDescription = Boolean(event.description?.trim());

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
      {!hasDescription && (
        <div style={{ marginTop: 6 }}>
          <CharacterIllustration src={MASCOT_IMAGES.empty} size={56} alt="Заходи позже" />
        </div>
      )}
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
