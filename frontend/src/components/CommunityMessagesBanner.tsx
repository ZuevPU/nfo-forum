import { Div } from '@vkontakte/vkui';
import { useEffect } from 'react';
import { updateMessagesPermission } from '../api/auth';
import { CommunityMessagesOptIn } from './CommunityMessagesOptIn';
import { MESSAGES_PERMISSION_KEY, useCommunityMessagesOptIn } from '../hooks/useCommunityMessagesOptIn';

interface Props {
  serverAllowed?: boolean;
  onEnabled: () => void;
}

export function CommunityMessagesBanner({ serverAllowed, onEnabled }: Props) {
  const { allowed, loading, hint, toggle } = useCommunityMessagesOptIn({
    persist: true,
    serverAllowed,
    onSuccess: onEnabled,
  });

  useEffect(() => {
    if (serverAllowed) return;
    if (localStorage.getItem(MESSAGES_PERMISSION_KEY) !== '1') return;
    void updateMessagesPermission(true)
      .then(() => onEnabled())
      .catch(console.error);
  }, [onEnabled, serverAllowed]);

  return (
    <Div style={{ padding: '8px 16px 0' }}>
      <CommunityMessagesOptIn
        allowed={allowed}
        loading={loading}
        hint={hint}
        onToggle={toggle}
        variant="compact"
      />
    </Div>
  );
}
