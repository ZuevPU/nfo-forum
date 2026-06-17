import { createRoot } from 'react-dom/client';
import { capturePendingDeepLink } from './lib/deepLink';
import { initVkBridge } from './lib/vk-bridge';

async function bootstrap() {
  capturePendingDeepLink();
  await initVkBridge();

  const { App } = await import('./App');
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('Root element not found');
  }

  createRoot(container).render(<App />);
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap app:', error);
  const container = document.getElementById('root');
  if (container) {
    container.textContent = 'Не удалось запустить приложение';
  }
});
