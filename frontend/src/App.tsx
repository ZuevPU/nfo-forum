import {
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
  SplitCol,
  SplitLayout,
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import './styles/theme.css';
import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { bridge, getLaunchParams } from './lib/vk-bridge';
import { transformVKBridgeAdaptivity } from './helpers/transformVKBridgeAdaptivity';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './routes/AppRouter';

export function App() {
  const [adaptivity, setAdaptivity] = useState(() =>
    transformVKBridgeAdaptivity({ viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }),
  );

  const { vk_platform } = getLaunchParams();

  useEffect(() => {
    bridge
      .send('VKWebAppGetConfig')
      .then((config) => {
        setAdaptivity(
          transformVKBridgeAdaptivity({
            type: (config as { appearance?: string }).appearance,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          }),
        );
      })
      .catch(() => {});

    bridge
      .send('VKWebAppSetViewSettings', {
        status_bar_style: 'dark',
        action_bar_color: '#f2f3f9',
        navigation_bar_color: '#f2f3f9',
      })
      .catch(() => {});
  }, []);

  return (
    <ConfigProvider
      colorScheme="light"
      platform={vk_platform === 'desktop_web' ? 'vkcom' : undefined}
      isWebView={bridge.isWebView()}
      hasCustomPanelHeaderAfter
    >
      <AdaptivityProvider {...adaptivity}>
        <AppRoot mode="full">
          <BrowserRouter>
            <AuthProvider>
              <SplitLayout>
                <SplitCol>
                  <AppRouter />
                </SplitCol>
              </SplitLayout>
            </AuthProvider>
          </BrowserRouter>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}
