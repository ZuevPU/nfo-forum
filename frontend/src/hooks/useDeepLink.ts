import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import {
  finalizeDeepLinkApply,
  isCurrentPathDeepLink,
  resolveDeepLinkRoute,
  resolveTargetDeepLinkRoute,
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
  const location = useLocation();
  const { status } = useAuthContext();
  const appliedRef = useRef(false);

  useLayoutEffect(() => {
    if (status !== 'authenticated') {
      appliedRef.current = false;
      return;
    }

    const target = resolveTargetDeepLinkRoute();
    if (!target) {
      if (appliedRef.current) finalizeDeepLinkApply();
      return;
    }

    if (isCurrentPathDeepLink(location.pathname, target)) {
      appliedRef.current = true;
      finalizeDeepLinkApply();
      return;
    }

    if (appliedRef.current) return;

    appliedRef.current = true;
    finalizeDeepLinkApply();
    navigate(target, { replace: true });
  }, [status, location.pathname, navigate]);

  useLayoutEffect(() => {
    if (status !== 'authenticated') return;

    const handler = (event: { detail?: { type?: string; data?: unknown } }) => {
      if (event.detail?.type !== 'VKWebAppLocationChanged') return;

      const data = event.detail.data as { location?: string } | undefined;
      const route = data?.location ? routeFromLocationPayload(data.location) : resolveDeepLinkRoute();
      if (!route || isCurrentPathDeepLink(location.pathname, route)) return;

      appliedRef.current = false;
      finalizeDeepLinkApply();
      navigate(route, { replace: true });
    };

    bridge.subscribe(handler);
  }, [status, location.pathname, navigate]);
}
