import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus, User } from '../../api/types';
import { COLUMN_DOT, COLUMN_EMPTY, COLUMN_TITLES } from './columns';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  usersById: Map<string, User>;
  filtered: boolean;
  onOpen: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
  /** True while a dragged card is over this column. */
  isDropTarget?: boolean;
}

export function Column({
  status,
  tasks,
  usersById,
  filtered,
  onOpen,
  onAdd,
  isDropTarget = false,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status}`,
    data: { type: 'column', status },
  });
  const title = COLUMN_TITLES[status];
  const headingId = `col-${status}-heading`;
  const empty = COLUMN_EMPTY[status];

  return (
    <section
      aria-labelledby={headingId}
      data-testid={`column-${status}`}
      className={`flex w-[min(var(--spacing-column),calc(100vw-2.5rem))] shrink-0 snap-center flex-col rounded-xl lg:max-h-full bg-panel shadow-sm transition-shadow sm:snap-start ${
        isDropTarget ? 'ring-3 ring-accent' : ''
      }`}
    >
      <h2
        id={headingId}
        className="flex items-center gap-2 px-3 pt-3 pb-0.5 text-sm font-semibold text-panel-ink"
      >
        <span
          aria-hidden="true"
          className={`size-2.5 shrink-0 rounded-full ${COLUMN_DOT[status]}`}
        />
        <span className="min-w-0 flex-1">{title}</span>
        <span
          className="rounded-full bg-slate-900/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700"
          data-testid="column-count"
          aria-label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}${filtered ? ' assigned to you' : ''}`}
        >
          {tasks.length}
        </span>
      </h2>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          aria-labelledby={headingId}
          className={`flex min-h-20 flex-1 flex-col gap-2 pt-1.5 lg:overflow-y-auto lg:overscroll-contain px-2 pb-2 transition-colors ${
            isOver ? 'bg-teal-900/5' : ''
          }`}
        >
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              assignee={t.assigneeId ? usersById.get(t.assigneeId) : undefined}
              onOpen={onOpen}
              columnTitle={title}
            />
          ))}
          {tasks.length === 0 && (
            <li
              className={`flex flex-1 list-none flex-col items-center justify-center rounded-lg border-2 border-dashed px-3 py-5 text-center ${
                isOver ? 'border-brand bg-teal-50' : 'border-slate-300'
              }`}
              data-testid="column-empty"
            >
              <p className="text-sm font-medium text-slate-700">
                {filtered ? 'None of your tasks here' : empty.title}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {filtered ? 'Turn off "My tasks" to see everyone\'s cards.' : empty.body}
              </p>
            </li>
          )}
        </ul>
      </SortableContext>
      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={() => onAdd(status)}
          className="focus-ring flex min-h-touch w-full items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-slate-900/10 hover:text-slate-900"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
            <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
          </svg>
          Add a card<span className="sr-only"> to {title}</span>
        </button>
      </div>
    </section>
  );
}
