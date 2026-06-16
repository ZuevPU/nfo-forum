import { Panel } from '@vkontakte/vkui';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Tabbar } from '../components/Tabbar';
import { useAuthContext } from '../contexts/AuthContext';
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
import { RegisterPanel } from '../panels/RegisterPanel';
import { SchedulePanel } from '../panels/SchedulePanel';
import { SettingsPanel } from '../panels/SettingsPanel';
import { StateCheckinPanel } from '../panels/StateCheckinPanel';
import { TasksPanel } from '../panels/TasksPanel';
import { WelcomePanel } from '../panels/WelcomePanel';

const MAIN_ROUTES = ['/home', '/schedule', '/questions', '/exchange', '/tasks', '/rating', '/checkin', '/diagnostics', '/nfo-day', '/settings'];

function HashRedirect() {
  const navigate = useNavigate();
  const { status } = useAuthContext();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#\/?/, '/');
    if (hash && hash !== '/' && hash !== window.location.pathname) {
      navigate(hash, { replace: true });
    }
  }, [navigate]);

  return (
    status === 'needs_registration'
      ? <Navigate to="/welcome" replace />
      : <Navigate to="/home" replace />
  );
}

export function AppRouter() {
  const { status } = useAuthContext();
  const location = useLocation();
  const showTabbar = MAIN_ROUTES.includes(location.pathname);

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
      <Routes>
          <Route path="/welcome" element={<WelcomePanel />} />
          <Route path="/reflection-level" element={<ReflectionLevelPanel />} />
          <Route path="/register" element={<RegisterPanel />} />
          <Route path="/home" element={<HomePanel />} />
          <Route path="/schedule" element={<SchedulePanel />} />
          <Route path="/questions" element={<QuestionsPanel />} />
          <Route path="/exchange" element={<ExchangePanel />} />
          <Route path="/exchange/incoming/:assignmentId" element={<ExchangeIncomingPanel />} />
          <Route path="/exchange/:id" element={<ExchangeDetailPanel />} />
          <Route path="/tasks" element={<TasksPanel />} />
          <Route path="/rating" element={<RatingPanel />} />
          <Route path="/checkin" element={<StateCheckinPanel />} />
          <Route path="/diagnostics" element={<DiagnosticsPanel />} />
          <Route path="/nfo-day" element={<NfoDayPanel />} />
          <Route path="/settings" element={<SettingsPanel />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/" element={<HashRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabbar && <Tabbar />}
    </>
  );
}
