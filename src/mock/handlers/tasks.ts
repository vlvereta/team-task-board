import { TASK_STATUSES, type Task, type TaskStatus } from '../../api/types';
import type { Db } from '../db';
import { ok, type Handler } from '../context';
import { HttpError, notFound, validationError } from '../errors';
import {
  checkAssignee,
  checkDescription,
  checkTitle,
  isErr,
  isStatus,
  requireObject,
  throwIfAny,
} from '../validation';

const columnOf = (db: Db, status: TaskStatus) =>
  db.tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

function renumber(db: Db, status: TaskStatus): void {
  columnOf(db, status).forEach((t, i) => {
    t.position = i;
  });
}

function orderedTasks(db: Db): Task[] {
  return TASK_STATUSES.flatMap((s) => columnOf(db, s));
}

function findTask(db: Db, id: string | undefined): Task {
  const task = db.tasks.find((t) => t.id === id);
  if (!task) throw notFound('Task not found.');
  return task;
}

export const listTasks: Handler = (ctx) => {
  const assignee = ctx.query['assignee'];
  let tasks = orderedTasks(ctx.db);
  if (assignee !== undefined) {
    const target = assignee === 'me' ? ctx.userId : assignee === 'unassigned' ? null : assignee;
    tasks = tasks.filter((t) => t.assigneeId === target);
  }
  return ok({ tasks });
};

export const createTask: Handler = (ctx) => {
  const body = requireObject(ctx.body);
  const fields: Record<string, string> = {};
  const userExists = (id: string) => ctx.db.users.some((u) => u.id === id);

  const title = checkTitle(body['title']);
  if (isErr(title)) fields['title'] = title.error;

  let description = '';
  if (body['description'] !== undefined) {
    const d = checkDescription(body['description']);
    if (isErr(d)) fields['description'] = d.error;
    else description = d;
  }

  let status: TaskStatus = 'todo';
  if (body['status'] !== undefined) {
    if (isStatus(body['status'])) status = body['status'];
    else fields['status'] = 'Choose a valid status.';
  }

  let assigneeId: string | null = null;
  if (body['assigneeId'] !== undefined) {
    const a = checkAssignee(body['assigneeId'], userExists);
    if (isErr(a)) fields['assigneeId'] = a.error;
    else assigneeId = a;
  }

  throwIfAny(fields);
  if (isErr(title)) throw validationError(fields);

  const stamp = new Date(ctx.now()).toISOString();
  const task: Task = {
    id: `t-${crypto.randomUUID()}`,
    title,
    description,
    status,
    position: columnOf(ctx.db, status).length,
    assigneeId,
    createdBy: ctx.userId,
    createdAt: stamp,
    updatedAt: stamp,
  };
  ctx.db.tasks.push(task);
  renumber(ctx.db, status);
  ctx.store.save(ctx.db);
  return ok({ task }, 201);
};

export const patchTask: Handler = (ctx) => {
  const task = findTask(ctx.db, ctx.params['id']);
  const body = requireObject(ctx.body);
  // Optimistic concurrency: the client says which version it edited.
  const expected = body['expectedUpdatedAt'];
  if (expected !== undefined) {
    if (typeof expected !== 'string') {
      throwIfAny({ expectedUpdatedAt: 'Must be the updatedAt value you last read.' });
    } else if (expected !== task.updatedAt) {
      throw new HttpError(
        409,
        'conflict',
        'This task was changed somewhere else after you opened it.',
      );
    }
  }
  const fields: Record<string, string> = {};
  const userExists = (id: string) => ctx.db.users.some((u) => u.id === id);
  const changes: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assigneeId'>> = {};

  if (body['title'] !== undefined) {
    const v = checkTitle(body['title']);
    if (isErr(v)) fields['title'] = v.error;
    else changes.title = v;
  }
  if (body['description'] !== undefined) {
    const v = checkDescription(body['description']);
    if (isErr(v)) fields['description'] = v.error;
    else changes.description = v;
  }
  if (body['status'] !== undefined) {
    if (isStatus(body['status'])) changes.status = body['status'];
    else fields['status'] = 'Choose a valid status.';
  }
  if (body['assigneeId'] !== undefined) {
    const v = checkAssignee(body['assigneeId'], userExists);
    if (isErr(v)) fields['assigneeId'] = v.error;
    else changes.assigneeId = v;
  }
  throwIfAny(fields);

  const oldStatus = task.status;
  if (changes.title !== undefined) task.title = changes.title;
  if (changes.description !== undefined) task.description = changes.description;
  if (changes.assigneeId !== undefined) task.assigneeId = changes.assigneeId;
  if (changes.status !== undefined && changes.status !== oldStatus) {
    task.status = changes.status;
    task.position = columnOf(ctx.db, changes.status).filter((t) => t !== task).length;
    renumber(ctx.db, oldStatus);
    renumber(ctx.db, changes.status);
  }
  task.updatedAt = new Date(ctx.now()).toISOString();
  ctx.store.save(ctx.db);
  return ok({ task });
};

export const moveTask: Handler = (ctx) => {
  const task = findTask(ctx.db, ctx.params['id']);
  const body = requireObject(ctx.body);
  const fields: Record<string, string> = {};
  const { status, position } = body;
  if (!isStatus(status)) fields['status'] = 'Choose a valid status.';
  if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) {
    fields['position'] = 'Position must be a whole number, 0 or more.';
  }
  throwIfAny(fields);
  if (!isStatus(status) || typeof position !== 'number') throw validationError(fields);

  const oldStatus = task.status;
  const target = columnOf(ctx.db, status).filter((t) => t !== task);
  target.splice(Math.min(position, target.length), 0, task);
  task.status = status;
  target.forEach((t, i) => {
    t.position = i;
  });
  if (oldStatus !== status) renumber(ctx.db, oldStatus);
  task.updatedAt = new Date(ctx.now()).toISOString();
  ctx.store.save(ctx.db);
  return ok({ tasks: orderedTasks(ctx.db) });
};

export const deleteTask: Handler = (ctx) => {
  const task = findTask(ctx.db, ctx.params['id']);
  ctx.db.tasks = ctx.db.tasks.filter((t) => t !== task);
  renumber(ctx.db, task.status);
  ctx.store.save(ctx.db);
  return ok(null, 204);
};
