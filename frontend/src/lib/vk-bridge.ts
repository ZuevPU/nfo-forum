import bridge, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import type { AppLifecycleState, VkUserInfo } from '../types/auth';

type LifecycleListener = (state: AppLifecycleState) => void;

const VK_GROUP_ID = Number(import.meta.env.VITE_VK_GROUP_ID ?? '231468147');
const MESSAGES_PERMISSION_KEY = 'nfo_vk_messages_from_group';

class AppLifecycleManager {
  private state: AppLifecycleState = 'active';
  private abortController: AbortController | null = null;
  private listeners = new Set<LifecycleListener>();

  get isPaused(): boolean {
    return this.state === 'background';
  }

  get currentState(): AppLifecycleState {
    return this.state;
  }

  get signal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }

  subscribe(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: AppLifecycleState): void {
    if (this.state === state) return;
    this.state = state;

    if (state === 'background') {
      this.abortController?.abort();
      this.abortController = new AbortController();
      console.info('[lifecycle] app_background');
    } else {
      console.info('[lifecycle] app_foreground');
    }

    this.listeners.forEach((listener) => listener(state));
  }

  handleBridgeEvent(event: { detail?: { type?: string } }): void {
    const type = event.detail?.type;

    if (type === 'VKWebAppViewHide') {
      this.setState('background');
    }

    if (type === 'VKWebAppViewRestore') {
      this.setState('active');
    }
  }
}

export const lifecycleManager = new AppLifecycleManager();

let bridgeInitialized = false;
type LaunchParams = ReturnType<typeof parseURLSearchParamsForGetLaunchParams>;

let launchParams: LaunchParams | null = null;
let vkUserInfo: VkUserInfo | null = null;

export const DEV_VK_ID = import.meta.env.VITE_DEV_VK_ID ?? 'dev_user_1';

function isDevMode(): boolean {
  return import.meta.env.DEV;
}

function needsDevMock(params: LaunchParams): boolean {
  return isDevMode() && params.vk_user_id == null;
}

function createDevLaunchParams(): LaunchParams {
  const numericId = Number(DEV_VK_ID.replace(/\D/g, '')) || 900001;
  return {
    vk_user_id: numericId,
    vk_platform: 'desktop_web',
    vk_is_app_user: 1,
  } as LaunchParams;
}

function createDevUserInfo(): VkUserInfo {
  const numericId = Number(DEV_VK_ID.replace(/\D/g, '')) || 900001;
  return {
    id: numericId,
    first_name: 'Тест',
    last_name: 'Пользователь',
  };
}

export function getDevVkId(): string | null {
  if (!isDevMode()) return null;
  const params = getLaunchParams();
  if (params.vk_user_id != null && needsDevMock(parseURLSearchParamsForGetLaunchParams(window.location.search)) === false) {
    return null;
  }
  return DEV_VK_ID;
}

async function initBridgeIfAvailable(): Promise<void> {
  if (bridgeInitialized) return;

  try {
    if (bridge.isWebView()) {
      await bridge.send('VKWebAppInit');
      bridge.subscribe((event) => {
        lifecycleManager.handleBridgeEvent(event);
      });
    } else if (!isDevMode()) {
      await bridge.send('VKWebAppInit');
      bridge.subscribe((event) => {
        lifecycleManager.handleBridgeEvent(event);
      });
    } else {
      console.info('[dev] VK Bridge mock mode — skipping VKWebAppInit');
    }
  } catch (error) {
    if (isDevMode()) {
      console.warn('[dev] VK Bridge unavailable, using mock:', error);
    } else {
      throw error;
    }
  }

  bridgeInitialized = true;
}

export async function initVkBridge(): Promise<{
  launchParams: LaunchParams;
  userInfo: VkUserInfo;
}> {
  await initBridgeIfAvailable();

  launchParams = parseURLSearchParamsForGetLaunchParams(window.location.search);

  if (needsDevMock(launchParams)) {
    launchParams = createDevLaunchParams();
    vkUserInfo = createDevUserInfo();
    console.info('[dev] Using mock vk_user_id:', launchParams.vk_user_id);
    return { launchParams, userInfo: vkUserInfo };
  }

  try {
    const response = await bridge.send('VKWebAppGetUserInfo');
    vkUserInfo = response as VkUserInfo;
  } catch {
    if (isDevMode()) {
      vkUserInfo = createDevUserInfo();
    } else {
      throw new Error('Failed to get VK user info');
    }
  }

  if (bridge.isWebView()) {
    void requestVkMessagesFromGroup(false).catch(() => {});
  }

  return {
    launchParams,
    userInfo: vkUserInfo,
  };
}

export async function requestVkMessagesFromGroup(force = false): Promise<boolean> {
  if (isDevMode() || !bridge.isWebView()) return false;
  if (!force && localStorage.getItem(MESSAGES_PERMISSION_KEY) === '1') return false;
  if (!VK_GROUP_ID) {
    console.warn('[push] VITE_VK_GROUP_ID is not set');
    return false;
  }

  try {
    const result = (await bridge.send('VKWebAppAllowMessagesFromGroup', {
      group_id: VK_GROUP_ID,
      key: 'nfo_forum_messages',
    })) as { result?: boolean };
    if (result?.result) {
      localStorage.setItem(MESSAGES_PERMISSION_KEY, '1');
    }
    return result?.result ?? false;
  } catch (error) {
    console.warn('[push] VKWebAppAllowMessagesFromGroup failed:', error);
    return false;
  }
}

export async function requestVkNotifications(): Promise<boolean> {
  if (isDevMode() || !bridge.isWebView()) return false;

  try {
    const result = (await bridge.send('VKWebAppAllowNotifications')) as { result?: boolean };
    return result?.result ?? false;
  } catch (error) {
    console.warn('[push] VKWebAppAllowNotifications failed:', error);
    return false;
  }
}

export function getLaunchParams(): LaunchParams {
  if (launchParams) return launchParams;
  const parsed = parseURLSearchParamsForGetLaunchParams(window.location.search);
  if (needsDevMock(parsed)) return createDevLaunchParams();
  return parsed;
}

export function getVkUserInfo(): VkUserInfo | null {
  return vkUserInfo;
}

export function getVkSignHeaders(): Record<string, string> {
  const params = getLaunchParams();
  const headers: Record<string, string> = {};

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      query.set(key, String(value));
    }
  }

  headers['Authorization'] = `VK ${query.toString()}`;

  const sign = (params as Record<string, unknown>).sign;
  if (sign != null) {
    headers['X-Vk-Sign'] = String(sign);
  }

  return headers;
}

export async function uploadFiles(count = 1): Promise<string[]> {
  try {
    const result = await (bridge.send as (method: string, props?: object) => Promise<unknown>)(
      'VKWebAppUploadFiles',
      { count, accept: 'image/*' },
    );
    const files = (result as { file?: { url?: string }[] })?.file ?? [];
    return files.map((f) => f.url).filter((u): u is string => Boolean(u));
  } catch {
    if (isDevMode()) {
      return [`https://placehold.co/200x200?text=dev+photo`];
    }
    throw new Error('File upload failed');
  }
}

export { bridge };
