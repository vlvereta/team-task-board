import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { errorMessage } from '../api/errors';
import type { Board, CreateTaskInput, Task, TaskStatus, UpdateTaskInput, User } from '../api/types';
import { applyMove, groupByStatus, sortTasks } from '../lib/ordering';
import { useAuth } from './AuthContext';
import { api } from './composition';
import { useToast } from './ToastContext';

type LoadStatus = 'loading' | 'error' | 'ready';

interface BoardDataValue {
  status: LoadStatus;
  loadError: string | null;
  board: Board | null;
  users: User[];
  tasks: Task[];
  reload: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: TaskStatus, position: number) => void;
  renameBoard: (name: string) => Promise<void>;
  updateMyName: (name: string) => Promise<void>;
  resetDemo: () => Promise<void>;
}

const BoardDataContext = createContext<BoardDataValue | null>(null);

export function BoardDataProvider({ children }: { children: ReactNode }) {
  const { setUser, refresh: refreshSession } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasksState] = useState<Task[]>([]);

  // Latest tasks for callbacks, and a serial queue so mutations reach the
  // server in the order the user made them (the mock has random latency).
  const tasksRef = useRef<Task[]>([]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);

  const setTasks = useCallback((next: Task[] | ((prev: Task[]) => Task[])) => {
    const value = typeof next === 'function' ? next(tasksRef.current) : next;
    tasksRef.current = sortTasks(value);
    setTasksState(tasksRef.current);
  }, []);

  const enqueue = useCallback(<T,>(op: () => Promise<T>): Promise<T> => {
    pending.current += 1;
    const run = queue.current.then(op, op);
    queue.current = run.catch(() => undefined);
    return run.finally(() => {
      pending.current -= 1;
    });
  }, []);

  const load = useCallback(
    async (mode: 'initial' | 'silent') => {
      if (mode === 'initial') {
        setStatus('loading');
        setLoadError(null);
      }
      try {
        const [b, u, t] = await Promise.all([api.board.get(), api.users.list(), api.tasks.list()]);
        setBoard(b);
        setUsers(u);
        if (pending.current === 0) setTasks(t);
        setStatus('ready');
      } catch (e) {
        if (mode === 'initial') {
          setLoadError(errorMessage(e));
          setStatus('error');
        }
      }
    },
    [setTasks],
  );

  useEffect(() => {
    // Data fetching on mount; state is set after the awaits resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load('initial');
  }, [load]);

  // Pick up changes made in another tab when this one regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pending.current === 0) void load('silent');
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const createTask = useCallback(
    (input: CreateTaskInput) =>
      enqueue(async () => {
        const task = await api.tasks.create(input);
        setTasks((prev) => [...prev.filter((t) => t.id !== task.id), task]);
        return task;
      }),
    [enqueue, setTasks],
  );

  const updateTask = useCallback(
    (id: string, input: UpdateTaskInput) =>
      enqueue(async () => {
        const task = await api.tasks.update(id, input);
        setTasks((prev) => {
          const old = prev.find((t) => t.id === id);
          const base =
            old && old.status !== task.status ? applyMove(prev, id, task.status, Infinity) : prev;
          return base.map((t) => (t.id === id ? { ...task, position: t.position } : t));
        });
        return task;
      }),
    [enqueue, setTasks],
  );

  const deleteTask = useCallback(
    (id: string) =>
      enqueue(async () => {
        await api.tasks.remove(id);
        setTasks((prev) => {
          const rest = prev.filter((t) => t.id !== id);
          const groups = groupByStatus(rest);
          return Object.values(groups).flatMap((col) => col.map((t, i) => ({ ...t, position: i })));
        });
      }),
    [enqueue, setTasks],
  );

  const moveTask = useCallback(
    (id: string, toStatus: TaskStatus, position: number) => {
      const before = tasksRef.current.find((t) => t.id === id);
      if (!before) return;
      if (before.status === toStatus && before.position === position) return;
      // Optimistic update.
      setTasks((prev) => applyMove(prev, id, toStatus, position));
      enqueue(() => api.tasks.move(id, { status: toStatus, position }))
        .then((serverTasks) => {
          // Only adopt the server's list once nothing else is in flight,
          // otherwise a later optimistic change would flicker back.
          if (pending.current === 0) setTasks(serverTasks);
        })
        .catch((e: unknown) => {
          // Roll back just this move, then reconcile with the server.
          setTasks((prev) => applyMove(prev, id, before.status, before.position));
          toast.show(
            `Couldn't move "${before.title}". It has been put back. (${errorMessage(e)})`,
            'error',
          );
          void load('silent');
        });
    },
    [enqueue, load, setTasks, toast],
  );

  const renameBoard = useCallback(async (name: string) => {
    setBoard(await api.board.rename(name));
  }, []);

  const updateMyName = useCallback(
    async (name: string) => {
      const me = await api.users.updateMe({ name });
      setUser(me);
      setUsers((prev) =>
        prev
          .map((u) => (u.id === me.id ? me : u))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
      );
    },
    [setUser],
  );

  const resetDemo = useCallback(async () => {
    await enqueue(() => api.demo.reset());
    // The reset removes accounts created since the seed; re-check ours.
    await refreshSession();
    await load('silent');
  }, [enqueue, load, refreshSession]);

  const value = useMemo<BoardDataValue>(
    () => ({
      status,
      loadError,
      board,
      users,
      tasks,
      reload: () => load('initial'),
      createTask,
      updateTask,
      deleteTask,
      moveTask,
      renameBoard,
      updateMyName,
      resetDemo,
    }),
    [
      status,
      loadError,
      board,
      users,
      tasks,
      load,
      createTask,
      updateTask,
      deleteTask,
      moveTask,
      renameBoard,
      updateMyName,
      resetDemo,
    ],
  );

  return <BoardDataContext.Provider value={value}>{children}</BoardDataContext.Provider>;
}

export function useBoardData(): BoardDataValue {
  const ctx = useContext(BoardDataContext);
  if (!ctx) throw new Error('useBoardData must be used inside BoardDataProvider');
  return ctx;
}
