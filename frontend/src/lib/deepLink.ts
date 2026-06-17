const STORAGE_KEY = 'nfo_pending_deeplink';

const ALLOWED_ROUTE =
  /^\/(home|schedule|questions|exchange|tasks|rating|checkin|diagnostics|nfo-day|settings|admin)(\/\d+)?(\/incoming\/\d+)?$/;

export function parseDeepLinkFragment(raw: string): string | null {
  const cleaned = raw.replace(/^#\/?/, '').trim();
  return cleaned || null;
}

export function routeFromFragment(fragment: string): string | null {
  const path = fragment.startsWith('/') ? fragment : `/${fragment}`;
  if (!ALLOWED_ROUTE.test(path)) return null;
  return path;
}

function readFragmentFromUrl(): string | null {
  const fromHash = parseDeepLinkFragment(window.location.hash);
  if (fromHash) return fromHash;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('hash');
  if (fromQuery) return fromQuery.replace(/^\//, '');

  return null;
}

export function resolveDeepLinkRoute(): string | null {
  const fragment = readFragmentFromUrl();
  if (!fragment) return null;
  return routeFromFragment(fragment);
}

export function capturePendingDeepLink(): void {
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const route = resolveDeepLinkRoute();
    if (route) sessionStorage.setItem(STORAGE_KEY, route);
  } catch {
    // sessionStorage may be unavailable
  }
}

export function peekPendingDeepLink(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function consumePendingDeepLink(): string | null {
  try {
    const route = sessionStorage.getItem(STORAGE_KEY);
    if (route) sessionStorage.removeItem(STORAGE_KEY);
    return route;
  } catch {
    return null;
  }
}

export function resolveActiveDeepLinkRoute(): string | null {
  return resolveDeepLinkRoute() ?? peekPendingDeepLink();
}
