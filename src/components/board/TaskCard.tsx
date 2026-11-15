import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KeyboardEvent } from 'react';
import type { Task, User } from '../../api/types';
import { Avatar } from '../ui/Avatar';

interface CardBodyProps {
  task: Task;
  assignee: User | undefined;
}

function CardBody({ task, assignee }: CardBodyProps) {
  return (
    <>
      <p className="line-clamp-4 text-sm font-medium leading-snug text-slate-900 [overflow-wrap:anywhere]">
        {task.title}
      </p>
      <div className="mt-2 flex min-h-7 items-center justify-between gap-2">
        {task.description.trim() ? (
          <svg
            aria-label="Has a description"
            role="img"
            viewBox="0 0 20 20"
            className="size-4 text-slate-500"
            fill="currentColor"
          >
            <path d="M3 5h14v1.5H3V5Zm0 4h14v1.5H3V9Zm0 4h9v1.5H3V13Z" />
          </svg>
        ) : (
          <span />
        )}
        {assignee ? (
          <Avatar name={assignee.name} color={assignee.avatarColor} />
        ) : (
          <span className="text-xs text-slate-500">Unassigned</span>
        )}
      </div>
    </>
  );
}

const cardClasses =
  'block w-full rounded-lg bg-white p-3 text-left shadow-[0_1px_0_rgb(15_23_42/0.12),0_1px_2px_rgb(15_23_42/0.08)] ring-1 ring-slate-900/5';

interface TaskCardProps extends CardBodyProps {
  onOpen: (id: string) => void;
  columnTitle: string;
}

export function TaskCard({ task, assignee, onOpen, columnTitle }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
  });

  const style = { transform: CSS.Translate.toString(transform), transition };

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    listeners?.onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'Enter' && !isDragging) {
      e.preventDefault();
      onOpen(task.id);
    }
  }

  return (
    <li className="list-none">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onKeyDown={onKeyDown}
        onClick={() => onOpen(task.id)}
        aria-label={`${task.title}. ${assignee ? `Assigned to ${assignee.name}` : 'Unassigned'}. In ${columnTitle}.`}
        aria-describedby="card-help"
        data-testid="task-card"
        data-task-id={task.id}
        className={`${cardClasses} focus-ring cursor-grab select-none hover:ring-slate-900/20 active:cursor-grabbing ${
          isDragging ? 'opacity-40 outline-2 outline-dashed outline-slate-400' : ''
        }`}
      >
        <CardBody task={task} assignee={assignee} />
      </div>
    </li>
  );
}

/** Floating copy of a card shown under the pointer while dragging. */
export function TaskCardPreview({ task, assignee }: CardBodyProps) {
  return (
    <div
      className={`${cardClasses} w-[var(--spacing-column)] max-w-[85vw] cursor-grabbing shadow-xl ring-2 ring-accent motion-safe:rotate-2`}
    >
      <CardBody task={task} assignee={assignee} />
    </div>
  );
}
