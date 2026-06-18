import { Button, Div, ModalPage, ModalPageHeader, ModalRoot } from '@vkontakte/vkui';
import type { EventDto } from '../api/home';
import { formatEventTimeMoscow } from '../lib/scheduleCache';

interface Props {
  event: EventDto | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: Props) {
  if (!event) return null;

  const hasDescription = Boolean(event.description?.trim());

  return (
    <ModalRoot activeModal="event-detail" onClose={onClose}>
      <ModalPage id="event-detail" onClose={onClose} settlingHeight={100}>
        <ModalPageHeader before={<Button mode="tertiary" onClick={onClose}>Закрыть</Button>}>
          {event.title}
        </ModalPageHeader>
        <Div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginBottom: 12 }}>
            {formatEventTimeMoscow(event.startTime)}
            {' – '}
            {formatEventTimeMoscow(event.endTime)}
            {event.place ? ` · ${event.place}` : ''}
            {event.track ? ` · ${event.track}` : ' · Общее'}
          </div>
          {hasDescription ? (
            <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {event.description}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)' }}>
              Описание скоро появится
            </div>
          )}
        </Div>
      </ModalPage>
    </ModalRoot>
  );
}
