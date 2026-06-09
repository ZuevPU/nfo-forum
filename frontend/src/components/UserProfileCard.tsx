import { Avatar, Div, Footnote, Headline } from '@vkontakte/vkui';
import type { UserDto } from '../types/auth';

interface Props {
  user: UserDto;
  trackRank?: number;
}

export function UserProfileCard({ user, trackRank }: Props) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <Div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar size={40} gradientColor="green">
        {initials}
      </Avatar>
      <div style={{ flex: 1 }}>
        <Headline level="2" weight="2">
          {user.firstName} {user.lastName ?? ''}
        </Headline>
        {user.track && (
          <Footnote style={{ color: 'var(--vkui--color_text_accent)' }}>{user.track}</Footnote>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <Headline level="2" weight="2" style={{ color: 'var(--vkui--color_text_accent)' }}>
          {user.points}
        </Headline>
        <Footnote>баллов</Footnote>
        {trackRank ? <Footnote>{trackRank} место в треке</Footnote> : null}
      </div>
    </Div>
  );
}
