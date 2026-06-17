import { Div } from '@vkontakte/vkui';
import { CharacterIllustration } from './CharacterIllustration';

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <Div style={{ padding: '32px 24px', textAlign: 'center' }}>
      <CharacterIllustration size={80} />
      <div style={{ marginTop: 12, color: '#888', fontSize: 13, lineHeight: 1.5 }}>{message}</div>
    </Div>
  );
}
