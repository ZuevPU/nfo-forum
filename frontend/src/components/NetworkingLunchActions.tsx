import { Button } from '@vkontakte/vkui';

export type NetworkingLunchPhase = 'registration' | 'applied' | 'seated' | 'closed';

export interface NetworkingLunchState {
  phase?: NetworkingLunchPhase;
  applied: boolean;
  tableNumber?: number | null;
  assignmentsSent?: boolean;
  canApply?: boolean;
}

interface Props {
  lunch: NetworkingLunchState;
  loading?: boolean;
  onApply?: () => void;
  compact?: boolean;
}

export function networkingLunchSubtitle(lunch: NetworkingLunchState): string {
  const phase = lunch.phase ?? inferPhase(lunch);
  if (phase === 'seated' && lunch.tableNumber) return `Стол № ${lunch.tableNumber} · приятного аппетита`;
  if (phase === 'applied') return 'Заявка принята · состав столов объявят позже';
  if (phase === 'registration') return 'Открыта регистрация · подтверди участие';
  if (phase === 'closed') return 'Регистрация завершена';
  return 'Нетворкинг-обед';
}

function inferPhase(lunch: NetworkingLunchState): NetworkingLunchPhase {
  if (lunch.tableNumber) return 'seated';
  if (lunch.assignmentsSent && !lunch.applied) return 'closed';
  if (lunch.applied) return 'applied';
  if (lunch.canApply) return 'registration';
  if (lunch.assignmentsSent) return 'closed';
  return 'closed';
}

export function NetworkingLunchActions({ lunch, loading, onApply, compact }: Props) {
  const phase = lunch.phase ?? inferPhase(lunch);

  if (phase === 'seated' && lunch.tableNumber) {
    return (
      <div style={{ fontSize: compact ? 11 : 13, fontWeight: 600, color: '#27ae60', marginTop: compact ? 0 : 12 }}>
        Ваш стол: № {lunch.tableNumber}. Приятного аппетита!
      </div>
    );
  }

  if (phase === 'applied') {
    return (
      <div style={{ fontSize: compact ? 11 : 13, color: '#f39c12', marginTop: compact ? 0 : 12, lineHeight: 1.45 }}>
        Заявка принята. Состав столов объявят позже.
      </div>
    );
  }

  if (phase === 'registration' && lunch.canApply !== false && onApply) {
    return (
      <>
        {!compact && (
          <div style={{ fontSize: 12, color: '#f39c12', marginBottom: 6, marginTop: 12 }}>
            Подтверди участие в нетворкинг-обеде
          </div>
        )}
        <Button
          size={compact ? 's' : 'm'}
          mode="primary"
          stretched={!compact}
          loading={loading}
          style={compact ? { marginTop: 8 } : { marginTop: 12 }}
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
        >
          Принять участие
        </Button>
      </>
    );
  }

  if (phase === 'closed') {
    return (
      <div
        style={{
          fontSize: compact ? 11 : 13,
          color: 'var(--vkui--color_text_secondary)',
          marginTop: compact ? 0 : 12,
        }}
      >
        Регистрация на обед завершена
      </div>
    );
  }

  return null;
}
