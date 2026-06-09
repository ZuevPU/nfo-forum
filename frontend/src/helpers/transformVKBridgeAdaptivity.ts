import { type AdaptivityProps, SizeType, ViewWidth } from '@vkontakte/vkui';

interface VKBridgeAdaptivity {
  type?: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

export function transformVKBridgeAdaptivity(adaptivity: VKBridgeAdaptivity): AdaptivityProps {
  const viewportWidth = adaptivity.viewportWidth ?? window.innerWidth;
  const viewportHeight = adaptivity.viewportHeight ?? window.innerHeight;

  let viewWidth: (typeof ViewWidth)[keyof typeof ViewWidth] = ViewWidth.MOBILE;
  if (viewportWidth >= 1280) viewWidth = ViewWidth.DESKTOP;
  else if (viewportWidth >= 1024) viewWidth = ViewWidth.TABLET;
  else if (viewportWidth >= 768) viewWidth = ViewWidth.SMALL_TABLET;

  const sizeX = viewportWidth >= 768 ? SizeType.REGULAR : SizeType.COMPACT;
  const sizeY = viewportHeight >= 1024 ? SizeType.REGULAR : SizeType.COMPACT;
  const hasPointer = adaptivity.type === 'desktop';

  return { viewWidth, sizeX, sizeY, hasPointer };
}
