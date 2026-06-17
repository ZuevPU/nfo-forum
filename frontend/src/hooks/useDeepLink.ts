import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import {
  capturePendingDeepLink,
  consumePendingDeepLink,
  resolveDeepLinkRoute,
  routeFromFragment,
} from '../lib/deepLink';
import { bridge } from '../lib/vk-bridge';

function routeFromLocationPayload(location: string): string | null {
  const fragment = location.replace(/^#\/?/, '').trim();
  if (!fragment) return null;
  return routeFromFragment(fragment);
}

export function useDeepLink() {
  const navigate = useNavigate();
  const { status } = useAuthContext();

  const applyDeepLink = useCallback(() => {
    if (status !== 'authenticated') return;

    const pending = consumePendingDeepLink();
    if (pending) {
      navigate(pending, { replace: true });
      return;
    }

    const route = resolveDeepLinkRoute();
    if (route) navigate(route, { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    applyDeepLink();
  }, [applyDeepLink]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const handler = (event: { detail?: { type?: string; data?: unknown } }) => {
      if (event.detail?.type !== 'VKWebAppLocationChanged') return;

      capturePendingDeepLink();

      const data = event.detail.data as { location?: string } | undefined;
      const route = data?.location ? routeFromLocationPayload(data.location) : resolveDeepLinkRoute();
      if (route) navigate(route, { replace: true });
    };

    bridge.subscribe(handler);
  }, [status, navigate]);
}
