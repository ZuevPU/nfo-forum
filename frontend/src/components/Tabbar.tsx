import {
  Icon28CalendarOutline,
  Icon28GameOutline,
  Icon28HelpOutline,
  Icon28HomeOutline,
  Icon28StarsOutline,
} from '@vkontakte/icons';
import { Tabbar as VKTabbar, TabbarItem } from '@vkontakte/vkui';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/home', label: 'Главная', Icon: Icon28HomeOutline },
  { path: '/schedule', label: 'Программа', Icon: Icon28CalendarOutline },
  { path: '/questions', label: 'Вопросы', Icon: Icon28HelpOutline },
  { path: '/exchange', label: 'Обмен', Icon: Icon28GameOutline },
  { path: '/tasks', label: 'Задания', Icon: Icon28StarsOutline },
] as const;

export function Tabbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <VKTabbar>
      {tabs.map(({ path, label, Icon }) => (
        <TabbarItem
          key={path}
          selected={location.pathname === path}
          onClick={() => navigate(path)}
          label={label}
        >
          <Icon />
        </TabbarItem>
      ))}
    </VKTabbar>
  );
}
