import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import type { TaskStatus } from '../api/types';
import { useAuth } from '../app/AuthContext';
import { useBoardData } from '../app/BoardDataContext';
import { BoardColumns } from '../components/board/BoardColumns';
import { CreateTaskDialog } from '../components/board/CreateTaskDialog';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useMyTasksFilter } from '../lib/useMyTasksFilter';

function BoardSkeleton() {
  return (
    <div
      className="relative flex min-h-0 flex-1 gap-3 overflow-hidden px-3 pt-3 sm:px-5"
      aria-busy="true"
    >
      <div role="status" className="absolute inset-x-4 top-1/3 z-10 flex justify-center">
        <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-lg">
          <Spinner className="size-4 text-brand" />
          Loading board…
        </span>
      </div>
      {[5, 3, 4].map((n, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex w-[min(var(--spacing-column),calc(100vw-2.5rem))] shrink-0 flex-col gap-2 self-start rounded-xl bg-panel p-3"
        >
          <div className="h-4 w-24 rounded bg-slate-300/70" />
          {Array.from({ length: n }, (_, j) => (
            <div key={j} className="h-16 rounded-lg bg-white/80 motion-safe:animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BoardPage() {
  const { user } = useAuth();
  const { status, loadError, reload, tasks, users, moveTask } = useBoardData();
  const [mine, setMine] = useMyTasksFilter();
  // The create dialog belongs to the history entry it was opened on, so any
  // navigation (e.g. browser Back) closes it.
  const [creating, setCreating] = useState<{ status: TaskStatus; key: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const visible = useMemo(
    () => (mine && user ? tasks.filter((t) => t.assigneeId === user.id) : tasks),
    [mine, user, tasks],
  );

  const creatingIn = creating && creating.key === location.key ? creating.status : null;
  const setCreatingIn = (status: TaskStatus | null) =>
    setCreating(status ? { status, key: location.key } : null);

  // After signing in (or any navigation that leaves focus on the page body),
  // move focus to the board so keyboard users start in the right place.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      status === 'ready' &&
      (!document.activeElement || document.activeElement === document.body)
    ) {
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [status]);

  const openTask = (id: string) => {
    // A double-click would otherwise push two history entries.
    if (window.location.hash.includes('/board/tasks/')) return;
    navigate({ pathname: `/board/tasks/${id}`, search: location.search });
  };
  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      className="flex min-h-0 flex-1 flex-col outline-none"
      aria-label="Board"
    >
      {mine && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-100 px-3 py-1 text-sm text-amber-950 sm:px-5"
          role="status"
          data-testid="filter-banner"
        >
          <span className="font-medium">
            Showing only tasks assigned to you ({visible.length} of {tasks.length}).
          </span>
          <button
            type="button"
            onClick={() => setMine(false)}
            className="focus-ring -mx-2 inline-flex min-h-touch items-center rounded-md px-2 font-semibold underline underline-offset-2 hover:bg-amber-200"
          >
            Show all tasks
          </button>
        </div>
      )}

      {status === 'loading' && <BoardSkeleton />}

      {status === 'error' && (
        <div className="flex flex-1 items-start justify-center p-4 pt-12">
          <div
            role="alert"
            className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-lg"
          >
            <h2 className="text-lg font-semibold text-slate-900">We couldn't load the board</h2>
            <p className="mt-2 text-sm text-slate-700">{loadError}</p>
            <Button className="mt-4" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <BoardColumns
          tasks={tasks}
          visible={visible}
          users={users}
          filtered={mine}
          onOpen={openTask}
          onAdd={setCreatingIn}
          onMove={moveTask}
        />
      )}

      {creatingIn && (
        <CreateTaskDialog
          status={creatingIn}
          defaultAssigneeId={mine && user ? user.id : ''}
          filtered={mine}
          onClose={() => setCreatingIn(null)}
        />
      )}
      <Outlet />
    </main>
  );
}
