import { Switch } from '@vkontakte/vkui';

interface Props {
  allowed: boolean;
  loading: boolean;
  hint: string | null;
  onToggle: (enabled: boolean) => void;
  variant?: 'register' | 'compact';
}

export function CommunityMessagesOptIn({
  allowed,
  loading,
  hint,
  onToggle,
  variant = 'compact',
}: Props) {
  const isRegister = variant === 'register';

  return (
    <div className={isRegister ? 'nfo-register-messages' : 'nfo-messages-optin'}>
      {isRegister && (
        <div className="nfo-register-messages__cta">
          Включи, чтобы быть в курсе всего на форуме
        </div>
      )}
      <div className={isRegister ? 'nfo-register-messages__card' : 'nfo-messages-optin__card'}>
        <div className={isRegister ? 'nfo-register-messages__title' : 'nfo-messages-optin__title'}>
          {isRegister
            ? 'Личные сообщения от сообщества «Цифровой Машук»'
            : 'Включи уведомления от сообщества'}
        </div>
        <div className={isRegister ? 'nfo-register-messages__text' : 'nfo-messages-optin__text'}>
          Сообщество Форума НФО «Цифровой Машук» присылает напоминания о расписании, заданиях,
          вопросах и рассылках. Без разрешения ты пропустишь важные уведомления.
        </div>
        <div className={isRegister ? 'nfo-register-messages__row' : 'nfo-messages-optin__row'}>
          <span className={isRegister ? 'nfo-register-messages__switch-label' : 'nfo-messages-optin__switch-label'}>
            Сообщения от сообщества
          </span>
          <div className={isRegister ? 'nfo-register-messages__switch-wrap' : undefined}>
            <Switch
              checked={allowed}
              disabled={loading}
              onChange={(e) => void onToggle(e.target.checked)}
            />
          </div>
        </div>
        {hint && <div className="nfo-messages-optin__hint">{hint}</div>}
        {isRegister && !allowed && (
          <div className="nfo-register-messages__warn">
            Переключатель справа — VK спросит разрешение один раз
          </div>
        )}
      </div>
    </div>
  );
}
