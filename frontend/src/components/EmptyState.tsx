import { Div } from '@vkontakte/vkui';
import { CharacterIllustration } from './CharacterIllustration';
import { MASCOT_IMAGES } from '../constants/mascotImages';

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <Div style={{ padding: '32px 24px', textAlign: 'center' }}>
      <CharacterIllustration src={MASCOT_IMAGES.empty} size={110} alt="Заходи позже" />
      <div style={{ marginTop: 12, color: '#888', fontSize: 13, lineHeight: 1.5 }}>{message}</div>
    </Div>
  );
}
