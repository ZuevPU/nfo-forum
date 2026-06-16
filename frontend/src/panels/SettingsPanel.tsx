import {
  Button,
  Div,
  FormItem,
  Group,
  Input,
  SimpleCell,
  Switch,
} from '@vkontakte/vkui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateNotificationPrefs, updateProfile } from '../api/auth';
import { PanelLayout } from '../components/PanelLayout';
import { REFLECTION_LEVEL_NAMES } from '../constants/nfoFactors';
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

  if (!user) return null;

  return (
    <PanelLayout id="settings" title="Настройки" loading={loading}>
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
        <SimpleCell subtitle={`Уровень рефлексии: ${REFLECTION_LEVEL_NAMES[user.reflectionLevel] ?? user.reflectionLevel}`}>
          {user.reflectionPoints} баллов рефлексии
        </SimpleCell>
        <Div>
          <Button size="m" stretched loading={saving} onClick={() => void handleSaveProfile()}>
            Сохранить профиль
          </Button>
        </Div>
      </Group>

      <Group header="Уведомления">
        {([
          ['program', 'Программа и расписание'],
          ['questions', 'Вопросы и рефлексия'],
          ['tasks', 'Задания'],
          ['exchange', 'Обмен опытом'],
          ['points', 'Баллы и рейтинг'],
        ] as const).map(([key, label]) => (
          <SimpleCell
            key={key}
            Component="label"
            after={<Switch checked={prefs[key]} onChange={(e) => void handleTogglePref(key, e.target.checked)} />}
          >
            {label}
          </SimpleCell>
        ))}
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
  );
}
