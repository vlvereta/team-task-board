import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Announcements,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  CollisionDetection,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TASK_STATUSES } from '../../api/types';
import type { Task, TaskStatus, User } from '../../api/types';
import { groupByStatus, positionInFullColumn } from '../../lib/ordering';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Column } from './Column';
import { COLUMN_TITLES } from './columns';
import { TaskCardPreview } from './TaskCard';

type Columns = Record<TaskStatus, string[]>;

interface BoardColumnsProps {
  /** All tasks (unfiltered). */
  tasks: Task[];
  /** Tasks currently shown. */
  visible: Task[];
  users: User[];
  filtered: boolean;
  onOpen: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
  onMove: (id: string, status: TaskStatus, position: number) => void;
}

function idsByStatus(tasks: Task[]): Columns {
  const g = groupByStatus(tasks);
  return {
    todo: g.todo.map((t) => t.id),
    in_progress: g.in_progress.map((t) => t.id),
    done: g.done.map((t) => t.id),
  };
}

function columnOf(id: UniqueIdentifier, cols: Columns): TaskStatus | undefined {
  const s = String(id);
  if (s.startsWith('column:')) return s.slice('column:'.length) as TaskStatus;
  return TASK_STATUSES.find((st) => cols[st].includes(s));
}

/**
 * Left/Right jump straight to the neighbouring column (dnd-kit's default
 * getter can first land on a nearby card in the same column); Up/Down use
 * the standard sortable behaviour.
 */
const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') {
    return sortableKeyboardCoordinates(event, args);
  }
  const { droppableRects, collisionRect } = args.context;
  if (!collisionRect) return undefined;
  const columns = TASK_STATUSES.map((s) => droppableRects.get(`column:${s}`)).filter(
    (r): r is NonNullable<typeof r> => !!r,
  );
  const centerX = collisionRect.left + collisionRect.width / 2;
  let current = columns.findIndex((r) => centerX >= r.left && centerX <= r.left + r.width);
  if (current < 0) {
    current = columns.reduce(
      (best, r, i) =>
        Math.abs(r.left + r.width / 2 - centerX) <
        Math.abs((columns[best]?.left ?? 0) + (columns[best]?.width ?? 0) / 2 - centerX)
          ? i
          : best,
      0,
    );
  }
  const target = columns[current + (event.code === 'ArrowRight' ? 1 : -1)];
  if (!target) return undefined;
  event.preventDefault();
  return { x: target.left + (target.width - collisionRect.width) / 2, y: target.top + 4 };
};

export function BoardColumns({
  tasks,
  visible,
  users,
  filtered,
  onOpen,
  onAdd,
  onMove,
}: BoardColumnsProps) {
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  // While dragging, the visible column order is kept locally so cards can
  // move between columns before the drop is committed.
  const [dragCols, setDragCols] = useState<Columns | null>(null);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const visibleCols = useMemo(() => idsByStatus(visible), [visible]);
  const cols = dragCols ?? visibleCols;

  // Collision handling for several sortable lists (the dnd-kit
  // "multiple containers" pattern). Without it, moving a card into another
  // column changes the layout, the next collision check can point back at the
  // old column, and the card ping-pongs until React stops with "Maximum update
  // depth exceeded".
  const colsRef = useRef(cols);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const justMovedColumn = useRef(false);
  useEffect(() => {
    colsRef.current = cols;
    // Let the layout settle for a frame after a card changes column.
    const frame = requestAnimationFrame(() => {
      justMovedColumn.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [cols]);

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    let hits = pointerHits;
    if (hits.length === 0 && args.pointerCoordinates) {
      // Pointer in the empty board area below a short column: use the column
      // whose horizontal band the pointer is in (drop at its end).
      const { x } = args.pointerCoordinates;
      const column = args.droppableContainers.find((c) => {
        const rect = args.droppableRects.get(c.id);
        return String(c.id).startsWith('column:') && !!rect && x >= rect.left && x <= rect.right;
      });
      if (column) {
        lastOverId.current = column.id;
        return [{ id: column.id }];
      }
    }
    if (hits.length === 0) hits = rectIntersection(args);
    let overId = getFirstCollision(hits, 'id');
    if (overId != null) {
      const key = String(overId);
      if (key.startsWith('column:')) {
        // Over a column: pick the closest card inside that column, if any.
        const ids = colsRef.current[key.slice('column:'.length) as TaskStatus] ?? [];
        if (ids.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (c) => c.id !== overId && ids.includes(String(c.id)),
            ),
          })[0]?.id;
          if (closest != null) overId = closest;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }
    // Right after a column change the card may briefly be over nothing;
    // keep the previous target instead of jumping back.
    if (justMovedColumn.current && activeIdRef.current) lastOverId.current = activeIdRef.current;
    return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press-and-hold starts a drag on touch, so swiping still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  );

  const titleOf = (id: UniqueIdentifier) => tasksById.get(String(id))?.title ?? 'card';
  const describe = (
    activeId: UniqueIdentifier,
    overId: UniqueIdentifier | undefined,
    c: Columns,
  ) => {
    if (overId === undefined) return 'not over a column';
    const col = columnOf(overId, c);
    if (!col) return 'not over a column';
    const active = String(activeId);
    const over = String(overId);
    const list = c[col];
    const inList = list.includes(active);
    const total = inList ? list.length : list.length + 1;
    let index: number;
    if (over.startsWith('column:')) index = inList ? list.indexOf(active) : total - 1;
    else if (over === active) index = list.indexOf(active);
    else index = inList ? list.indexOf(over) : Math.max(list.indexOf(over), 0);
    return `${COLUMN_TITLES[col]}, position ${Math.min(index + 1, total)} of ${total}`;
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${titleOf(active.id)}. Use arrow keys to move, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) =>
      `${titleOf(active.id)} is over ${describe(active.id, over?.id, cols)}.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${titleOf(active.id)} in ${describe(active.id, over.id, cols)}.`
        : `${titleOf(active.id)} was dropped back.`,
    onDragCancel: ({ active }) =>
      `Moving ${titleOf(active.id)} was cancelled. It is back where it started.`,
  };

  function handleDragStart(e: DragStartEvent) {
    lastOverId.current = null;
    justMovedColumn.current = false;
    setActiveId(String(e.active.id));
    setDragCols(visibleCols);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    if (justMovedColumn.current) return;
    const c = dragCols ?? visibleCols;
    const from = columnOf(active.id, c);
    const to = columnOf(over.id, c);
    if (!from || !to || from === to) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const target = c[to].filter((id) => id !== activeKey);
    const overIndex = target.indexOf(overKey);
    let insertAt = overIndex >= 0 ? overIndex : target.length;
    // Over the lower half of a card: go after it.
    if (overIndex >= 0 && over.rect && active.rect.current.translated) {
      const activeCenter =
        active.rect.current.translated.top + active.rect.current.translated.height / 2;
      if (activeCenter > over.rect.top + over.rect.height / 2) insertAt += 1;
    }
    target.splice(insertAt, 0, activeKey);
    justMovedColumn.current = true;
    setDragCols({ ...c, [from]: c[from].filter((id) => id !== activeKey), [to]: target });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const c = dragCols ?? visibleCols;
    setActiveId(null);
    setDragCols(null);
    if (!over) return;
    const id = String(active.id);
    const to = columnOf(over.id, c);
    if (!to) return;
    let order = c[to];
    const oldIndex = order.indexOf(id);
    const overIndex = order.indexOf(String(over.id));
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex)
      order = arrayMove(order, oldIndex, overIndex);
    // Map the visible order back to a position in the full (unfiltered) column.
    const fullColumn = groupByStatus(tasks)[to];
    const full = fullColumn.map((t) => t.id).filter((x) => x !== id);
    const position = positionInFullColumn(full, order, id);
    onMove(id, to, position);
  }

  const activeTask = activeId ? tasksById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      // Gentler edge scrolling, so a card held near the screen edge on a
      // phone moves one column at a time instead of racing to the end.
      autoScroll={{ threshold: { x: 0.12, y: 0.15 }, acceleration: 3 }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDragCols(null);
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To open the card, press Enter. To move it, press Space, use the arrow keys to choose a place, then press Space again. Press Escape to cancel.',
        },
      }}
    >
      <p id="card-help" className="sr-only">
        Press Enter to open. Press Space to pick up and move with the arrow keys.
      </p>
      <div
        className={`relative flex flex-1 snap-x items-start gap-3 overflow-x-auto overscroll-x-contain px-3 pt-3 pb-4 sm:snap-none sm:px-5 lg:min-h-0 ${
          activeId ? 'snap-none' : 'snap-mandatory'
        }`}
        data-testid="column-strip"
      >
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={cols[status].map((id) => tasksById.get(id)).filter((t): t is Task => !!t)}
            usersById={usersById}
            filtered={filtered}
            onOpen={onOpen}
            onAdd={onAdd}
            isDropTarget={!!activeId && cols[status].includes(activeId)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {activeTask ? (
          <TaskCardPreview
            task={activeTask}
            assignee={activeTask.assigneeId ? usersById.get(activeTask.assigneeId) : undefined}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
