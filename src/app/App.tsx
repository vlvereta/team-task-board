import { Navigate, Outlet, RouterProvider, createHashRouter, useLocation } from 'react-router';
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

// A data router (rather than <HashRouter>) so dialogs can block navigation
// while they hold unsaved changes (useBlocker).
const router = createHashRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/board',
        element: <BoardPage />,
        children: [{ path: 'tasks/:taskId', element: <TaskRoute /> }],
      },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/board" replace /> },
]);

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
