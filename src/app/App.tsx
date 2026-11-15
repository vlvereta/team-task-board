import { Navigate, Outlet, RouterProvider, createHashRouter, useLocation } from 'react-router';
import { BoardPage } from '../pages/BoardPage';
import { LoginPage } from '../pages/LoginPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SignupPage } from '../pages/SignupPage';
import { TaskRoute } from '../pages/TaskRoute';
import { AppHeader } from '../components/board/AppHeader';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
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

function SessionUnreachable() {
  const { refresh, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-board p-4">
      <div role="alert" className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-lg">
        <h1 className="text-lg font-semibold text-slate-900">We can't reach the server</h1>
        <p className="mt-2 text-sm text-slate-700">
          Your session is still here. Check your connection and try again.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => logout()}>
            Log out
          </Button>
          <Button
            busy={retrying}
            onClick={() => {
              setRetrying(true);
              void refresh().finally(() => setRetrying(false));
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Board routes: signed-out visitors go to the login page (and come back after). */
function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking') return <FullPageSpinner />;
  if (status === 'unreachable') return <SessionUnreachable />;
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
