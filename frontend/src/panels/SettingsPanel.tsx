import {
  Button,
  Div,
  FormItem,
  Group,
  Input,
  ModalPage,
  ModalPageHeader,
  ModalRoot,
  SimpleCell,
  Switch,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateNotificationPrefs, updateProfile } from '../api/auth';
import { FeedbackOrganizersContent } from '../components/FeedbackOrganizersContent';
import { PanelLayout } from '../components/PanelLayout';
import { REFLECTION_LEVEL_NAMES } from '../constants/nfoFactors';
import { useCommunityMessagesOptIn } from '../hooks/useCommunityMessagesOptIn';
import { useAuthContext } from '../contexts/AuthContext';

const APP_VERSION = '1.1.0';

export function SettingsPanel() {
  const navigate = useNavigate();
  const { user, refreshUser, deleteUserAccount } = useAuthContext();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [prefs, setPrefs] = useState({
    program: true,
    questions: true,
    tasks: true,
    exchange: true,
    points: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const {
    allowed: messagesAllowed,
    loading: messagesLoading,
    hint: messagesHint,
    toggle: toggleCommunityMessages,
  } = useCommunityMessagesOptIn({
    persist: true,
    serverAllowed: user?.messagesFromGroupAllowed,
    onSuccess: () => void refreshUser(),
  });

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName ?? '');
    if (user.notificationPrefs) {
      setPrefs(user.notificationPrefs);
    }
    setLoading(false);
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(firstName.trim(), lastName.trim() || undefined);
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePref = async (key: keyof typeof prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await updateNotificationPrefs(next);
    await refreshUser();
  };

  const handleToggleCommunityMessages = (enabled: boolean) => {
    void toggleCommunityMessages(enabled);
  };

  if (!user) return null;

  return (
    <>
      <PanelLayout id="settings" title="Настройки" loading={loading} useGradient backToHome>
        <Group header="Профиль">
          <FormItem top="Имя">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormItem>
          <FormItem top="Фамилия">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormItem>
          <SimpleCell subtitle="Направление">{user.track ?? '—'}</SimpleCell>
          {user.createdAt && (
            <SimpleCell subtitle="Дата регистрации">
              {new Date(user.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </SimpleCell>
          )}
          <SimpleCell
            subtitle={`Уровень рефлексии: ${REFLECTION_LEVEL_NAMES[user.reflectionLevel] ?? user.reflectionLevel}`}
            onClick={() => navigate('/reflection-level')}
          >
            {user.reflectionPoints} баллов рефлексии
          </SimpleCell>
          <Div>
            <Button size="m" mode="primary" stretched loading={saving} onClick={() => void handleSaveProfile()}>
              Сохранить профиль
            </Button>
          </Div>
        </Group>

        <Group header="Уведомления">
          <SimpleCell
            subtitle="Личные сообщения от сообщества «Цифровой Машук». Выключите, чтобы не получать напоминания."
            multiline
            after={
              <Switch
                checked={messagesAllowed}
                disabled={messagesLoading}
                onChange={(e) => handleToggleCommunityMessages(e.target.checked)}
              />
            }
          >
            Сообщения от сообщества
          </SimpleCell>
          {messagesHint && (
            <Div style={{ padding: '0 16px 8px', fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
              {messagesHint}
            </Div>
          )}
          {([
            ['program', 'Программа и расписание'],
            ['questions', 'Вопросы и рефлексия'],
            ['tasks', 'Задания'],
            ['exchange', 'Обмен опытом'],
            ['points', 'Баллы и рейтинг'],
          ] as const).map(([key, label]) => (
            <SimpleCell
              key={key}
              after={<Switch checked={prefs[key]} onChange={(e) => void handleTogglePref(key, e.target.checked)} />}
            >
              {label}
            </SimpleCell>
          ))}
        </Group>

        <Group header="Связь">
          <Div>
            <Button size="l" mode="primary" stretched onClick={() => setActiveModal('feedback')}>
              Связь с организаторами
            </Button>
          </Div>
        </Group>

        <Group header="О приложении">
          <SimpleCell subtitle="Версия">{APP_VERSION}</SimpleCell>
          <SimpleCell subtitle="Поддержка">online@czmashuk.ru</SimpleCell>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button size="l" mode="outline" stretched onClick={() => navigate('/home')}>
              На главную
            </Button>
            <Button
              size="l"
              stretched
              mode="outline"
              className="nfo-btn-danger-outline"
              onClick={() => void deleteUserAccount()}
            >
              Удалить аккаунт
            </Button>
          </Div>
        </Group>
      </PanelLayout>

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id="feedback"
          onClose={() => setActiveModal(null)}
          header={
            <ModalPageHeader>
              Связь с организаторами
            </ModalPageHeader>
          }
        >
          <FeedbackOrganizersContent />
        </ModalPage>
      </ModalRoot>
    </>
  );
}
