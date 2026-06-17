import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

function parseDeepLinkHash(raw: string): string | null {
  const cleaned = raw.replace(/^#\/?/, '').trim();
  return cleaned || null;
}

function routeFromDeepLink(fragment: string): string | null {
  const path = fragment.startsWith('/') ? fragment : `/${fragment}`;
  const allowed = /^\/(home|schedule|questions|exchange|tasks|rating|checkin|diagnostics|nfo-day|settings|admin)(\/\d+)?(\/incoming\/\d+)?$/;
  if (!allowed.test(path)) return null;
  return path;
}

export function useDeepLink() {
  const navigate = useNavigate();
  const { status } = useAuthContext();
  const handled = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || handled.current) return;

    const fragment = parseDeepLinkHash(window.location.hash);
    if (!fragment) return;

    const route = routeFromDeepLink(fragment);
    if (!route) return;

    handled.current = true;
    navigate(route, { replace: true });
  }, [status, navigate]);
}
