import { Div } from '@vkontakte/vkui';
import { CharacterIllustration } from './CharacterIllustration';

interface Props {
  points?: number;
  pendingReview?: boolean;
}

export function TaskSuccessBanner({ points, pendingReview }: Props) {
  const subtitle = pendingReview
    ? 'Задание отправлено на проверку'
    : points != null
      ? `+${points} баллов начислено`
      : 'Задание отправлено';

  return (
    <Div style={{ padding: '8px 16px 0' }}>
      <div
        style={{
          background: '#e2f8f3',
          borderRadius: 16,
          padding: 20,
          textAlign: 'center',
        }}
      >
        <CharacterIllustration size={90} />
        <div style={{ marginTop: 10, color: '#0f6e56', fontSize: 18, fontWeight: 700 }}>Отлично!</div>
        <div style={{ marginTop: 6, color: '#3bbfa0', fontSize: 14, fontWeight: 600 }}>{subtitle}</div>
      </div>
    </Div>
  );
}
