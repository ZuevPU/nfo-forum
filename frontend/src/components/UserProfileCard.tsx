import type { UserDto } from '../types/auth';

interface Props {
  user: UserDto;
  trackRank?: number;
}

export function UserProfileCard({ user }: Props) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="nfo-profile-card">
      <div className="nfo-profile-card__avatar">{initials}</div>
      <div style={{ flex: 1 }}>
        <div className="nfo-profile-card__name">
          {user.firstName} {user.lastName ?? ''}
        </div>
        {user.track && <div className="nfo-profile-card__track">{user.track}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="nfo-profile-card__points">{user.points} б.</div>
      </div>
    </div>
  );
}
