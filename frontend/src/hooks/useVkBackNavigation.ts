import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bridge } from '../lib/vk-bridge';
import { useLayout } from '../contexts/LayoutContext';

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

      if (location.pathname !== '/home') {
        navigate('/home');
      }
    };

    bridge.subscribe(handler);
  }, [backHandler, location.pathname, navigate]);
}
