import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../api/types';
import { ApiError } from '../api/errors';

const task = (id: string, status: Task['status'], position: number): Task => ({
  id,
  title: `Task ${id}`,
  description: '',
  status,
  position,
  assigneeId: null,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
});

const seed = [task('a', 'todo', 0), task('b', 'todo', 1), task('c', 'done', 0)];
const move = vi.fn();

vi.mock('./composition', () => ({
  onSessionExpired: () => () => {},
  api: {
    auth: { me: vi.fn() },
    board: { get: vi.fn(async () => ({ id: 'b', name: 'Board', columns: [] })) },
    users: { list: vi.fn(async () => []) },
    tasks: { list: vi.fn(async () => seed), move: (...args: unknown[]) => move(...args) },
  },
}));

const { AuthProvider } = await import('./AuthContext');
const { BoardDataProvider, useBoardData } = await import('./BoardDataContext');
const { ToastProvider } = await import('./ToastContext');

let ctx: ReturnType<typeof useBoardData>;
function Probe() {
  // Test probe: expose the context to the test body.
  // eslint-disable-next-line react-hooks/globals
  ctx = useBoardData();
  const cols = (s: Task['status']) =>
    ctx.tasks
      .filter((t) => t.status === s)
      .map((t) => t.id)
      .join(',');
  return <p data-testid="state">{`todo:${cols('todo')} done:${cols('done')}`}</p>;
}

function renderProvider() {
  render(
    <ToastProvider>
      <AuthProvider>
        <BoardDataProvider>
          <Probe />
        </BoardDataProvider>
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('BoardDataProvider.moveTask', () => {
  beforeEach(() => {
    move.mockReset();
  });

  it('updates optimistically before the API answers', async () => {
    let resolve!: (t: Task[]) => void;
    move.mockReturnValue(new Promise((r) => (resolve = r)));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('todo:a,b done:c'));
    act(() => ctx.moveTask('a', 'done', 1));
    expect(screen.getByTestId('state')).toHaveTextContent('todo:b done:c,a');
    await act(async () =>
      resolve([task('b', 'todo', 0), task('c', 'done', 0), task('a', 'done', 1)]),
    );
    expect(screen.getByTestId('state')).toHaveTextContent('todo:b done:c,a');
  });

  it('rolls back and shows a message when the API call fails', async () => {
    move.mockImplementation(async () => {
      throw new ApiError(500, 'internal_error', 'Simulated server failure.');
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('todo:a,b done:c'));
    act(() => ctx.moveTask('b', 'done', 0));
    expect(screen.getByTestId('state')).toHaveTextContent('todo:a done:b,c');
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('todo:a,b done:c'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't move "Task b"/);
  });

  it('sends queued moves to the server in order', async () => {
    const calls: string[] = [];
    move.mockImplementation(async (id: string) => {
      calls.push(`start ${id}`);
      await new Promise((r) => setTimeout(r, id === 'a' ? 30 : 1));
      calls.push(`end ${id}`);
      return seed;
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('todo:a,b done:c'));
    act(() => {
      ctx.moveTask('a', 'done', 0);
      ctx.moveTask('b', 'done', 0);
    });
    await waitFor(() => expect(calls).toHaveLength(4));
    expect(calls).toEqual(['start a', 'end a', 'start b', 'end b']);
  });
});
