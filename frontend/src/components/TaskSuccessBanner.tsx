import { Div } from '@vkontakte/vkui';
import { CharacterIllustration } from './CharacterIllustration';
import { MASCOT_IMAGES } from '../constants/mascotImages';

interface Props {
  points?: number;
  pendingReview?: boolean;
  subtitle?: string;
}

export function TaskSuccessBanner({ points, pendingReview, subtitle }: Props) {
  const resolvedSubtitle =
    subtitle ??
    (pendingReview
      ? 'Задание отправлено на проверку'
      : points != null
        ? `+${points} баллов начислено`
        : 'Задание отправлено');

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
        <CharacterIllustration src={MASCOT_IMAGES.success} size={110} alt="Отлично, ты молодец!" />
        <div style={{ marginTop: 10, color: '#3bbfa0', fontSize: 14, fontWeight: 600 }}>{resolvedSubtitle}</div>
      </div>
    </Div>
  );
}
