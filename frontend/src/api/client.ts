import { lifecycleManager } from '../lib/vk-bridge';
import { DEV_VK_ID, getLaunchParams, getVkSignHeaders, getVkUserInfo } from '../lib/vk-bridge';

const API_URL = import.meta.env.VITE_API_URL;

export class ApiPausedError extends Error {
  constructor() {
    super('Request paused: app is in background');
    this.name = 'ApiPausedError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

function getVkId(): string | null {
  if (import.meta.env.DEV && !window.location.search.includes('vk_user_id')) {
    return DEV_VK_ID;
  }
  const launchParams = getLaunchParams();
  const info = getVkUserInfo();
  if (launchParams.vk_user_id != null) return String(launchParams.vk_user_id);
  if (info?.id != null) return String(info.id);
  return null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (lifecycleManager.isPaused) {
    throw new ApiPausedError();
  }

  const { body, headers, signal, ...rest } = options;
  const vkId = getVkId();

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(vkId ? { 'X-Vk-Id': vkId } : {}),
      ...getVkSignHeaders(),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: signal ?? lifecycleManager.signal,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function getVkIdForDownload(): string | null {
  if (import.meta.env.DEV && !window.location.search.includes('vk_user_id')) {
    return DEV_VK_ID;
  }
  const launchParams = getLaunchParams();
  const info = getVkUserInfo();
  if (launchParams.vk_user_id != null) return String(launchParams.vk_user_id);
  if (info?.id != null) return String(info.id);
  return null;
}

export async function downloadApiFile(path: string, filename: string): Promise<void> {
  if (lifecycleManager.isPaused) {
    throw new ApiPausedError();
  }

  const vkId = getVkIdForDownload();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(vkId ? { 'X-Vk-Id': vkId } : {}),
      ...getVkSignHeaders(),
    },
    signal: lifecycleManager.signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = (data as { error?: string } | null)?.error ?? `Download failed: ${response.status}`;
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
