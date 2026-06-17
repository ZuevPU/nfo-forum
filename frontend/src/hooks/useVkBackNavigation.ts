import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bridge } from '../lib/vk-bridge';
import { useLayout } from '../contexts/LayoutContext';

function parentRoute(pathname: string): string | null {
  if (pathname.startsWith('/tasks/')) return '/tasks';
  if (pathname.startsWith('/questions/')) return '/questions';
  if (pathname.startsWith('/exchange/incoming/')) return '/exchange';
  if (pathname.startsWith('/exchange/')) return '/exchange';
  if (pathname !== '/home') return '/home';
  return null;
}

export function useVkBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { backHandler } = useLayout();

  useEffect(() => {
    void bridge.send('VKWebAppSetSwipeSettings', { history: true }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (event: { detail?: { type?: string } }) => {
      if (event.detail?.type !== 'VKWebAppBack') return;

      if (backHandler?.()) return;

      const fallback = parentRoute(location.pathname);
      if (fallback) navigate(fallback);
    };

    bridge.subscribe(handler);
  }, [backHandler, location.pathname, navigate]);
}
