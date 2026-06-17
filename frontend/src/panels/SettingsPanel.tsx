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
  Textarea,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateNotificationPrefs, updateProfile, updateMessagesPermission } from '../api/auth';
import { submitFeedback } from '../api/home';
import { PanelLayout } from '../components/PanelLayout';
import { REFLECTION_LEVEL_NAMES } from '../constants/nfoFactors';
import { requestVkMessagesFromGroup } from '../lib/vk-bridge';
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
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesHint, setMessagesHint] = useState<string | null>(null);

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

  const handleToggleCommunityMessages = async (enabled: boolean) => {
    setMessagesHint(null);
    setMessagesLoading(true);
    try {
      if (enabled) {
        const allowed = await requestVkMessagesFromGroup(true);
        if (!allowed) {
          setMessagesHint('Разреши сообщения от сообщества во всплывающем окне VK — иначе уведомления не придут.');
          return;
        }
        await updateMessagesPermission(true);
      } else {
        await updateMessagesPermission(false);
      }
      await refreshUser();
    } catch (e) {
      console.error(e);
      setMessagesHint('Не удалось сохранить настройку. Попробуй ещё раз.');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSubmitting(true);
    try {
      await submitFeedback(feedbackText.trim());
      setFeedbackText('');
      setActiveModal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <PanelLayout id="settings" title="Настройки" loading={loading} useGradient>
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
            <Button size="m" stretched loading={saving} onClick={() => void handleSaveProfile()}>
              Сохранить профиль
            </Button>
          </Div>
        </Group>

        <Group header="Уведомления">
          <SimpleCell
            subtitle="Личные сообщения от сообщества Форума НФО"
            after={
              <Switch
                checked={user.messagesFromGroupAllowed ?? false}
                disabled={messagesLoading}
                onChange={(e) => void handleToggleCommunityMessages(e.target.checked)}
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
            <Button mode="secondary" stretched onClick={() => setActiveModal('feedback')}>
              Написать организатору
            </Button>
          </Div>
        </Group>

        <Group header="О приложении">
          <SimpleCell subtitle="Версия">{APP_VERSION}</SimpleCell>
          <SimpleCell subtitle="Поддержка">forum-nfo@vk.com</SimpleCell>
          <Div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button mode="secondary" stretched onClick={() => navigate('/home')}>
              На главную
            </Button>
            <Button mode="secondary" stretched onClick={() => void deleteUserAccount()}>
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
          <FormItem top="Твоё сообщение">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Напиши вопрос или предложение..."
            />
          </FormItem>
          <Div>
            <Button size="l" stretched loading={feedbackSubmitting} onClick={() => void handleFeedbackSubmit()}>
              Отправить
            </Button>
          </Div>
        </ModalPage>
      </ModalRoot>
    </>
  );
}
