import { Button, Div, Group, Link, Panel, Spinner } from '@vkontakte/vkui';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommunityMessagesOptIn } from '../components/CommunityMessagesOptIn';
import { GradientHeader } from '../components/GradientHeader';
import {
  COMMUNITY_NAME,
  COMMUNITY_URL,
  GUIDE_START_STEP_IMAGE,
  GUIDE_STEPS,
  GUIDE_WHY,
} from '../constants/communityMessages';
import { useAuthContext } from '../contexts/AuthContext';
import { useCommunityMessagesOptIn } from '../hooks/useCommunityMessagesOptIn';

export function CommunityMessagesGuidePanel() {
  const navigate = useNavigate();
  const { user, status, refreshUser } = useAuthContext();
  const { allowed, loading, hint, toggle } = useCommunityMessagesOptIn({
    persist: true,
    serverAllowed: user?.messagesFromGroupAllowed,
    onSuccess: () => {
      void refreshUser().then(() => navigate('/home', { replace: true }));
    },
  });

  useEffect(() => {
    if (status === 'authenticated' && user?.messagesFromGroupAllowed) {
      navigate('/home', { replace: true });
    }
  }, [status, user?.messagesFromGroupAllowed, navigate]);

  if (status === 'loading' || !user) {
    return (
      <Panel id="onboarding-messages">
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      </Panel>
    );
  }

  const handleEnable = () => {
    void toggle(true);
  };

  return (
    <Panel id="onboarding-messages">
      <GradientHeader
        title="Важно: уведомления форума"
        subtitle={`Личные сообщения от «${COMMUNITY_NAME}»`}
      />
      <Group>
        <Div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>{GUIDE_WHY}</div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--vkui--color_text_secondary)',
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            Как включить
          </div>
          <ol style={{ margin: '0 0 16px', paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
            {GUIDE_STEPS.map((step, index) => (
              <li key={step} style={{ marginBottom: 8 }}>
                {step}
                {index === 2 && (
                  <img
                    src={GUIDE_START_STEP_IMAGE}
                    alt={`Как нажать «Начать» в сообществе «${COMMUNITY_NAME}»`}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      marginTop: 12,
                      borderRadius: 8,
                    }}
                  />
                )}
              </li>
            ))}
          </ol>
          <Link href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
            Открыть сообщество «{COMMUNITY_NAME}»
          </Link>
        </Div>
      </Group>

      <Div style={{ padding: '0 16px' }}>
        <CommunityMessagesOptIn
          allowed={allowed}
          loading={loading}
          hint={hint}
          onToggle={toggle}
          variant="register"
        />
      </Div>

      <Div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button size="l" mode="primary" stretched loading={loading} disabled={allowed} onClick={handleEnable}>
          {allowed ? 'Сообщения включены' : 'Включить сообщения'}
        </Button>
        {allowed && (
          <Button size="l" mode="primary" stretched onClick={() => navigate('/home', { replace: true })}>
            Перейти на главную
          </Button>
        )}
        {!allowed && (
          <Button size="l" mode="secondary" stretched onClick={() => navigate('/home', { replace: true })}>
            Продолжить на главную
          </Button>
        )}
      </Div>
    </Panel>
  );
}
