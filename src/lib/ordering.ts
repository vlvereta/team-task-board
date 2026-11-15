import { TASK_STATUSES } from '../api/types';
import type { Task, TaskStatus } from '../api/types';

const statusIndex = (s: TaskStatus) => TASK_STATUSES.indexOf(s);

/** Board order: column, then position. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => statusIndex(a.status) - statusIndex(b.status) || a.position - b.position,
  );
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const t of sortTasks(tasks)) groups[t.status].push(t);
  return groups;
}

/**
 * Local mirror of the server's move rule: take the task out of its column and
 * insert it at `position` (clamped) in the target column; renumber both.
 */
export function applyMove(tasks: Task[], id: string, status: TaskStatus, position: number): Task[] {
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return tasks;
  const groups = groupByStatus(tasks.filter((t) => t.id !== id));
  const target = groups[status];
  const index = Math.max(0, Math.min(position, target.length));
  target.splice(index, 0, { ...moving, status });
  const result: Task[] = [];
  for (const s of TASK_STATUSES) {
    groups[s].forEach((t, i) =>
      result.push(t.position === i && t.status === s ? t : { ...t, position: i }),
    );
  }
  return result;
}

/**
 * Translate a drop position in a filtered view into a position in the full
 * column. `visibleAfter` is the visible column order after the drop (it
 * contains `movedId`); `fullColumn` is the full target column without the
 * moved task.
 */
export function positionInFullColumn(
  fullColumn: string[],
  visibleAfter: string[],
  movedId: string,
): number {
  const i = visibleAfter.indexOf(movedId);
  const before = i > 0 ? visibleAfter[i - 1] : undefined;
  if (before !== undefined) {
    const idx = fullColumn.indexOf(before);
    if (idx >= 0) return idx + 1;
  }
  const after = visibleAfter[i + 1];
  if (after !== undefined) {
    const idx = fullColumn.indexOf(after);
    if (idx >= 0) return idx;
  }
  return fullColumn.length;
}
