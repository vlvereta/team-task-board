import type { TaskStatus } from '../../api/types';

export const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const COLUMN_EMPTY: Record<TaskStatus, { title: string; body: string }> = {
  todo: { title: 'Nothing planned yet', body: 'Add a card for the next piece of work.' },
  in_progress: {
    title: 'Nothing in progress',
    body: 'Drag a card here when someone starts on it.',
  },
  done: { title: 'Nothing finished yet', body: 'Finished cards land here.' },
};

export const COLUMN_DOT: Record<TaskStatus, string> = {
  todo: 'bg-slate-500',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-600',
};
