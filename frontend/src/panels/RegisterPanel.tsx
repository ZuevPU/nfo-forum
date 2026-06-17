import {
  Button,
  Checkbox,
  Div,
  FormItem,
  Group,
  Input,
  Link,
  Panel,
  PanelHeader,
  Placeholder,
  Spinner,
  Title,
} from '@vkontakte/vkui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommunityMessagesOptIn } from '../components/CommunityMessagesOptIn';
import { GradientHeader } from '../components/GradientHeader';
import { TRACKS, type Track } from '../constants/tracks';
import { useCommunityMessagesOptIn } from '../hooks/useCommunityMessagesOptIn';
import { useAuthContext } from '../contexts/AuthContext';

export function RegisterPanel() {
  const { vkUserInfo, registerUser, error, status } = useAuthContext();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTrack, setSelectedTrack] = useState<Track>('НФО и образование');
  const [firstName, setFirstName] = useState(vkUserInfo?.first_name ?? '');
  const [lastName, setLastName] = useState(vkUserInfo?.last_name ?? '');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { allowed: messagesAllowed, loading: messagesLoading, hint: messagesHint, toggle: toggleMessages } =
    useCommunityMessagesOptIn({ persist: false });

  const handleRegister = async () => {
    if (!termsAccepted || !firstName.trim()) return;
    await registerUser(selectedTrack, { firstName: firstName.trim(), lastName: lastName.trim() || undefined });
    navigate('/home');
  };

  if (status === 'loading') {
    return (
      <Panel id="register">
        <PanelHeader>Регистрация</PanelHeader>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="l" />
        </Div>
      </Panel>
    );
  }

  if (step === 1) {
    return (
      <Panel id="register">
        <GradientHeader title="Добро пожаловать!" subtitle="Шаг 1 из 2 — уведомления" />
        <Group>
          <Div style={{ padding: '8px 16px 16px' }}>
            <CommunityMessagesOptIn
              allowed={messagesAllowed}
              loading={messagesLoading}
              hint={messagesHint}
              onToggle={toggleMessages}
              variant="register"
            />
          </Div>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px' }}>
            <Button
              size="l"
              mode="primary"
              stretched
              disabled={!messagesAllowed}
              onClick={() => setStep(2)}
            >
              Далее
            </Button>
            {!messagesAllowed && (
              <Button size="l" mode="tertiary" stretched onClick={() => setStep(2)}>
                Продолжить без сообщений
              </Button>
            )}
          </Div>
        </Group>
        <Placeholder>Рекомендуем включить — иначе не придут напоминания от «Цифровой Машук»</Placeholder>
      </Panel>
    );
  }

  return (
    <Panel id="register">
      <GradientHeader title="Регистрация" subtitle="Шаг 2 из 2 — данные участника" />
      <Group>
        <FormItem top="Фамилия">
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </FormItem>
        <FormItem top="Имя">
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </FormItem>
        <FormItem top="Направление участия">
          <div className="nfo-track-grid">
            {TRACKS.map((track) => (
              <button
                key={track}
                type="button"
                className={`nfo-track-option${selectedTrack === track ? ' nfo-track-option--selected' : ''}`}
                onClick={() => setSelectedTrack(track)}
              >
                {track}
              </button>
            ))}
          </div>
        </FormItem>
        {error && (
          <Div>
            <Title level="3" style={{ color: 'var(--vkui--color_text_negative)' }}>
              {error}
            </Title>
          </Div>
        )}
        <FormItem>
          <Checkbox checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}>
            Я принимаю{' '}
            <Link href="https://vk.com/away.php?to=https%3A%2F%2Fvk.com%2Fterms" target="_blank" rel="noopener noreferrer">пользовательское соглашение</Link> и{' '}
            <Link href="https://vk.com/away.php?to=https%3A%2F%2Fvk.com%2Fprivacy" target="_blank" rel="noopener noreferrer">политику конфиденциальности</Link>
          </Checkbox>
        </FormItem>
        <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="l" mode="primary" stretched disabled={!termsAccepted || !firstName.trim()} onClick={() => void handleRegister()}>
            Зарегистрироваться
          </Button>
          <Button size="l" mode="outline" stretched onClick={() => setStep(1)}>
            Назад
          </Button>
        </Div>
      </Group>
      <Placeholder>Выберите трек — его нельзя будет изменить</Placeholder>
    </Panel>
  );
}
