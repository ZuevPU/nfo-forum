import { Avatar, Div, Footnote, Headline } from '@vkontakte/vkui';
import type { UserDto } from '../types/auth';

interface Props {
  user: UserDto;
  trackRank?: number;
}

export function UserProfileCard({ user, trackRank }: Props) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.14)', padding: '10px 12px', borderRadius: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--nfo-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
          {user.firstName} {user.lastName ?? ''}
        </div>
        {user.track && (
          <div style={{ fontSize: 9, fontWeight: 700, background: 'rgba(59,191,160,0.28)', border: '1px solid rgba(59,191,160,0.5)', color: 'var(--nfo-accent)', borderRadius: 5, padding: '2px 8px', marginTop: 4, display: 'inline-block' }}>
            {user.track}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ background: 'var(--nfo-accent)', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#fff', display: 'inline-block' }}>
          {user.points} б.
        </div>
      </div>
    </div>
  );
}
