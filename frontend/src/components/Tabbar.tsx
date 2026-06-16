import { FixedLayout } from '@vkontakte/vkui';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/home', label: 'Главная', emoji: '🏠' },
  { path: '/schedule', label: 'Программа', emoji: '📅' },
  { path: '/questions', label: 'Вопросы', emoji: '💬' },
  { path: '/exchange', label: 'Обмен', emoji: '💡' },
  { path: '/tasks', label: 'Задания', emoji: '⭐' },
] as const;

export function Tabbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <FixedLayout vertical="bottom" filled>
      <nav className="nfo-bot-nav" aria-label="Навигация">
        {tabs.map(({ path, label, emoji }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              type="button"
              className={`nfo-nav-item${active ? ' active' : ''}`}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="ni">{emoji}</span>
              <span className="nl">{label}</span>
            </button>
          );
        })}
      </nav>
    </FixedLayout>
  );
}
