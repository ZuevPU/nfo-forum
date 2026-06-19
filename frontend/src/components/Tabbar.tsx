import { FixedLayout } from '@vkontakte/vkui';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout } from '../contexts/LayoutContext';

const tabs = [
  { path: '/home', label: 'Главная', emoji: '🏠', badgeKey: null },
  { path: '/schedule', label: 'Программа', emoji: '📅', badgeKey: null },
  { path: '/questions', label: 'Вопросы', emoji: '💬', badgeKey: 'questions' as const },
  { path: '/exchange', label: 'Обмен', emoji: '💡', badgeKey: null },
  { path: '/tasks', label: 'Задания', emoji: '⭐', badgeKey: 'tasks' as const },
] as const;

export function Tabbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { navBadges } = useLayout();

  return (
    <FixedLayout vertical="bottom" filled>
      <nav className="nfo-bot-nav" aria-label="Навигация">
        {tabs.map(({ path, label, emoji, badgeKey }) => {
          const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
          const badge = badgeKey ? navBadges[badgeKey] : 0;
          return (
            <button
              key={path}
              type="button"
              className={`nfo-nav-item${active ? ' active' : ''}`}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              aria-label={badge > 0 ? `${label}, ${badge} активных` : label}
            >
              <span className="ni">
                <span className="ni-emoji" aria-hidden>{emoji}</span>
                {badge > 0 ? <span className="nfo-nav-badge">{badge > 9 ? '9+' : badge}</span> : null}
              </span>
              <span className="nl">{label}</span>
            </button>
          );
        })}
      </nav>
    </FixedLayout>
  );
}
