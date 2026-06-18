import { Panel } from '@vkontakte/vkui';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { resolveActiveDeepLinkRoute } from '../lib/deepLink';
import { Tabbar } from '../components/Tabbar';
import { useAuthContext } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { useDeepLink } from '../hooks/useDeepLink';
import { useVkBackNavigation } from '../hooks/useVkBackNavigation';
import { AdminPanel } from '../panels/AdminPanel';
import { DiagnosticsPanel } from '../panels/DiagnosticsPanel';
import { ExchangeDetailPanel } from '../panels/ExchangeDetailPanel';
import { ExchangeIncomingPanel } from '../panels/ExchangeIncomingPanel';
import { ExchangePanel } from '../panels/ExchangePanel';
import { HomePanel } from '../panels/HomePanel';
import { NfoDayPanel } from '../panels/NfoDayPanel';
import { QuestionsPanel } from '../panels/QuestionsPanel';
import { RatingPanel } from '../panels/RatingPanel';
import { ReflectionLevelPanel } from '../panels/ReflectionLevelPanel';
import { CommunityMessagesGuidePanel } from '../panels/CommunityMessagesGuidePanel';
import { RegisterPanel } from '../panels/RegisterPanel';
import { SchedulePanel } from '../panels/SchedulePanel';
import { SettingsPanel } from '../panels/SettingsPanel';
import { NotificationsPanel } from '../panels/NotificationsPanel';
import { StateCheckinPanel } from '../panels/StateCheckinPanel';
import { TasksPanel } from '../panels/TasksPanel';
import { WelcomePanel } from '../panels/WelcomePanel';

const MAIN_ROUTE_PREFIXES = ['/home', '/schedule', '/questions', '/exchange', '/tasks', '/rating', '/checkin', '/diagnostics', '/nfo-day', '/settings', '/notifications'];

function isMainRoute(pathname: string) {
  return MAIN_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function HashRedirect() {
  const { status } = useAuthContext();
  const deepLink = resolveActiveDeepLinkRoute();

  if (status === 'needs_registration') {
    return <Navigate to="/welcome" replace />;
  }

  if (deepLink) {
    return (
      <Panel id="deeplink-loading">
        <div style={{ padding: 48, textAlign: 'center' }}>Загрузка...</div>
      </Panel>
    );
  }

  return <Navigate to="/home" replace />;
}

export function AppRouter() {
  const { status } = useAuthContext();
  const { tabbarHidden } = useLayout();
  const location = useLocation();
  const isMain = isMainRoute(location.pathname);
  const showTabbar = isMain && !tabbarHidden;

  useVkBackNavigation();
  useDeepLink();

  if (status === 'loading') {
    return (
      <Panel id="loading">
        <div style={{ padding: 48, textAlign: 'center' }}>Загрузка...</div>
      </Panel>
    );
  }

  if (status === 'error') {
    return (
      <Panel id="error">
        <div style={{ padding: 48, textAlign: 'center' }}>Ошибка авторизации</div>
      </Panel>
    );
  }

  return (
    <>
      <div className={isMain ? 'nfo-with-tabbar' : undefined}>
      <Routes>
          <Route path="/welcome" element={<WelcomePanel />} />
          <Route path="/reflection-level" element={<ReflectionLevelPanel />} />
          <Route path="/register" element={<RegisterPanel />} />
          <Route path="/onboarding/messages" element={<CommunityMessagesGuidePanel />} />
          <Route path="/home" element={<HomePanel />} />
          <Route path="/schedule" element={<SchedulePanel />} />
          <Route path="/questions/:questionId" element={<QuestionsPanel />} />
          <Route path="/questions" element={<QuestionsPanel />} />
          <Route path="/exchange" element={<ExchangePanel />} />
          <Route path="/exchange/incoming/:assignmentId" element={<ExchangeIncomingPanel />} />
          <Route path="/exchange/:id" element={<ExchangeDetailPanel />} />
          <Route path="/tasks/:taskId?" element={<TasksPanel />} />
          <Route path="/rating" element={<RatingPanel />} />
          <Route path="/checkin" element={<StateCheckinPanel />} />
          <Route path="/diagnostics" element={<DiagnosticsPanel />} />
          <Route path="/nfo-day" element={<NfoDayPanel />} />
          <Route path="/settings" element={<SettingsPanel />} />
          <Route path="/notifications" element={<NotificationsPanel />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/" element={<HashRedirect />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      </div>
      {showTabbar && <Tabbar />}
    </>
  );
}
