import { Div } from '@vkontakte/vkui';
import type { HomeData } from '../api/home';
import { NetworkingLunchActions } from './NetworkingLunchActions';

export type NetworkingLunchView = NonNullable<HomeData['networkingLunch']>;

interface Props {
  lunch: NetworkingLunchView;
  loading?: boolean;
  onApply: () => void;
}

export function NetworkingLunchHomeSection({ lunch, loading, onApply }: Props) {
  return (
    <Div style={{ padding: '12px 16px' }}>
      <div
        className="nfo-card"
        style={{
          margin: 0,
          border: lunch.phase === 'registration' ? '2px solid #f39c12' : undefined,
          boxShadow: lunch.phase === 'registration' ? '0 0 0 1px rgba(243, 156, 18, 0.12)' : undefined,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--vkui--color_text_primary)' }}>
            {lunch.title}
          </div>
          {lunch.points > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nfo-primary)', flexShrink: 0 }}>
              {lunch.points} б.
            </div>
          )}
        </div>

        {lunch.phase !== 'seated' && lunch.description && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--vkui--color_text_secondary)',
              marginTop: 8,
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
            }}
          >
            {lunch.description}
          </div>
        )}

        {lunch.phase === 'seated' && lunch.tableNumber != null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#27ae60', lineHeight: 1.4 }}>
              Вы обедаете за столом № {lunch.tableNumber}
            </div>
            <div style={{ fontSize: 13, color: 'var(--vkui--color_text_secondary)', marginTop: 6 }}>
              Приятного аппетита!
            </div>
          </div>
        )}

        {lunch.phase !== 'seated' && (
          <NetworkingLunchActions
            lunch={{
              phase: lunch.phase,
              applied: lunch.applied,
              tableNumber: lunch.tableNumber,
              assignmentsSent: lunch.assignmentsSent,
              canApply: lunch.canApply,
            }}
            loading={loading}
            onApply={onApply}
          />
        )}
      </div>
    </Div>
  );
}
