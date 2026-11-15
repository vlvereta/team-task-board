import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { BoardPage } from '../pages/BoardPage';
import { LoginPage } from '../pages/LoginPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SignupPage } from '../pages/SignupPage';
import { TaskRoute } from '../pages/TaskRoute';
import { AppHeader } from '../components/board/AppHeader';
import { Spinner } from '../components/ui/Spinner';
import { AuthProvider, useAuth } from './AuthContext';
import { BoardDataProvider } from './BoardDataContext';
import { ToastProvider } from './ToastContext';

function FullPageSpinner() {
  return (
    <div
      role="status"
      className="flex min-h-dvh items-center justify-center gap-3 bg-board text-board-ink"
    >
      <Spinner className="size-6" />
      <span className="text-sm font-medium">Loading Crewboard…</span>
    </div>
  );
}

/** Board routes: signed-out visitors go to the login page (and come back after). */
function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking') return <FullPageSpinner />;
  if (status === 'signedOut') {
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return (
    <BoardDataProvider>
      <div className="flex min-h-dvh flex-col bg-board lg:h-dvh">
        <AppHeader />
        <Outlet />
      </div>
    </BoardDataProvider>
  );
}

/** Login and sign-up: signed-in users go straight to the board. */
function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking') return <FullPageSpinner />;
  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/board'} replace />;
  }
  return <Outlet />;
}

export function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/board" element={<BoardPage />}>
                <Route path="tasks/:taskId" element={<TaskRoute />} />
              </Route>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/board" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
