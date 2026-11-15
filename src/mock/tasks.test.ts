// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Task } from '../api/types';
import { call, columnPositions, getTasks, login, makeServer } from './testHelpers';

async function setup() {
  const { server, storage } = makeServer();
  const { token, id } = await login(server);
  return { server, storage, token, id };
}

function dense(tasks: Task[]) {
  const pos = columnPositions(tasks);
  for (const list of Object.values(pos)) expect(list).toEqual(list.map((_, i) => i));
}

const ids = (tasks: Task[], status: string) =>
  tasks.filter((t) => t.status === status).map((t) => t.id);

describe('GET /tasks', () => {
  it('returns all tasks ordered by column then position', async () => {
    const { server, token } = await setup();
    const res = await call(server, 'GET', '/tasks', { token });
    expect(res.status).toBe(200);
    const tasks: Task[] = res.body.tasks;
    expect(tasks).toHaveLength(12);
    const order = ['todo', 'in_progress', 'done'];
    for (let i = 1; i < tasks.length; i++) {
      const a = tasks[i - 1]!;
      const b = tasks[i]!;
      const ka = order.indexOf(a.status) * 1000 + a.position;
      const kb = order.indexOf(b.status) * 1000 + b.position;
      expect(ka).toBeLessThan(kb);
    }
    dense(tasks);
  });

  it('assignee=me', async () => {
    const { server, token, id } = await setup();
    const tasks = await getTasks(server, token, '?assignee=me');
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.assigneeId === id)).toBe(true);
  });

  it('assignee=<id>', async () => {
    const { server, token } = await setup();
    const tasks = await getTasks(server, token, '?assignee=u-ben');
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.assigneeId === 'u-ben')).toBe(true);
  });

  it('assignee=unassigned', async () => {
    const { server, token } = await setup();
    const tasks = await getTasks(server, token, '?assignee=unassigned');
    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks.every((t) => t.assigneeId === null)).toBe(true);
  });

  it('unknown assignee gives an empty list', async () => {
    const { server, token } = await setup();
    expect(await getTasks(server, token, '?assignee=u-ghost')).toEqual([]);
  });

  it('requires auth', async () => {
    const { server } = await setup();
    expect((await call(server, 'GET', '/tasks')).status).toBe(401);
  });

  it('returns copies: mutating a response does not change the store', async () => {
    const { server, token } = await setup();
    const first = await getTasks(server, token);
    first[0]!.title = 'MUTATED';
    first.pop();
    const second = await getTasks(server, token);
    expect(second).toHaveLength(12);
    expect(second.some((t) => t.title === 'MUTATED')).toBe(false);
  });
});

describe('POST /tasks', () => {
  it('applies defaults and appends to the end of todo', async () => {
    const { server, token, id } = await setup();
    const before = (await getTasks(server, token)).filter((t) => t.status === 'todo').length;
    const res = await call(server, 'POST', '/tasks', { token, body: { title: '  New one ' } });
    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      title: 'New one',
      description: '',
      status: 'todo',
      position: before,
      assigneeId: null,
      createdBy: id,
    });
    expect(res.body.task.id).toMatch(/^t-/);
    expect(res.body.task.createdAt).toBe(res.body.task.updatedAt);
    expect(new Date(res.body.task.createdAt).toISOString()).toBe(res.body.task.createdAt);
  });

  it('accepts status, description and assignee', async () => {
    const { server, token } = await setup();
    const before = (await getTasks(server, token)).filter((t) => t.status === 'done').length;
    const res = await call(server, 'POST', '/tasks', {
      token,
      body: { title: 'T', description: ' Details ', status: 'done', assigneeId: 'u-dev' },
    });
    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      description: 'Details',
      status: 'done',
      position: before,
      assigneeId: 'u-dev',
    });
    dense(await getTasks(server, token));
  });

  it.each([
    ['missing title', {}, 'title'],
    ['blank title', { title: '   ' }, 'title'],
    ['non-string title', { title: 3 }, 'title'],
    ['title too long', { title: 'x'.repeat(201) }, 'title'],
    ['description too long', { title: 'a', description: 'x'.repeat(5001) }, 'description'],
    ['bad status', { title: 'a', status: 'blocked' }, 'status'],
    ['unknown assignee', { title: 'a', assigneeId: 'u-ghost' }, 'assigneeId'],
    ['numeric assignee', { title: 'a', assigneeId: 5 }, 'assigneeId'],
  ])('400 for %s', async (_l, body, field) => {
    const { server, token } = await setup();
    const res = await call(server, 'POST', '/tasks', { token, body });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.fields).toHaveProperty(field);
    expect(await getTasks(server, token)).toHaveLength(12);
  });

  it('accepts a 200-character title and 5000-character description', async () => {
    const { server, token } = await setup();
    const res = await call(server, 'POST', '/tasks', {
      token,
      body: { title: 'x'.repeat(200), description: 'y'.repeat(5000) },
    });
    expect(res.status).toBe(201);
  });

  it('400 when the body is missing', async () => {
    const { server, token } = await setup();
    expect((await call(server, 'POST', '/tasks', { token })).status).toBe(400);
  });
});

describe('PATCH /tasks/:id with expectedUpdatedAt (two editors)', () => {
  it('accepts the edit when the version matches', async () => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token))[0]!;
    const res = await call(server, 'PATCH', `/tasks/${target.id}`, {
      token,
      body: { title: 'Mine', expectedUpdatedAt: target.updatedAt },
    });
    expect(res.status).toBe(200);
  });

  it('returns 409 when someone else saved first, and changes nothing', async () => {
    let t = 1_700_000_000_000;
    const { server } = makeServer({ now: () => t });
    const { token } = await login(server);
    const opened = (await getTasks(server, token))[0]!;
    t += 1000;
    await call(server, 'PATCH', `/tasks/${opened.id}`, { token, body: { title: 'First save' } });
    const res = await call(server, 'PATCH', `/tasks/${opened.id}`, {
      token,
      body: { title: 'Second save', expectedUpdatedAt: opened.updatedAt },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('conflict');
    const now = (await getTasks(server, token)).find((x) => x.id === opened.id)!;
    expect(now.title).toBe('First save');
  });

  it('rejects a non-string expectedUpdatedAt with 400', async () => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token))[0]!;
    const res = await call(server, 'PATCH', `/tasks/${target.id}`, {
      token,
      body: { title: 'x', expectedUpdatedAt: 5 },
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /tasks/:id', () => {
  it('updates title, description and assignee, refreshing updatedAt', async () => {
    let t = 1_700_000_000_000;
    const { server } = makeServer({ now: () => t });
    const { token } = await login(server);
    const target = (await getTasks(server, token))[0]!;
    t += 5000;
    const res = await call(server, 'PATCH', `/tasks/${target.id}`, {
      token,
      body: {
        title: ' Renamed ',
        description: 'New text',
        assigneeId: null,
        position: 99,
        junk: 1,
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({
      id: target.id,
      title: 'Renamed',
      description: 'New text',
      assigneeId: null,
      position: target.position,
      status: target.status,
    });
    expect(res.body.task.updatedAt).toBe(new Date(t).toISOString());
    expect(res.body.task.updatedAt).not.toBe(target.updatedAt);
    expect(res.body.task.createdAt).toBe(target.createdAt);
    expect(res.body.task).not.toHaveProperty('junk');
  });

  it('a status change moves the task to the end of the new column and renumbers', async () => {
    const { server, token } = await setup();
    const before = await getTasks(server, token);
    const target = before.find((t) => t.status === 'todo' && t.position === 0)!;
    const doneCount = before.filter((t) => t.status === 'done').length;
    const res = await call(server, 'PATCH', `/tasks/${target.id}`, {
      token,
      body: { status: 'done' },
    });
    expect(res.body.task.status).toBe('done');
    expect(res.body.task.position).toBe(doneCount);
    const after = await getTasks(server, token);
    dense(after);
    expect(ids(after, 'todo')).toEqual(ids(before, 'todo').slice(1));
  });

  it('an unchanged status leaves the position alone', async () => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token)).find(
      (t) => t.status === 'todo' && t.position === 1,
    )!;
    const res = await call(server, 'PATCH', `/tasks/${target.id}`, {
      token,
      body: { status: 'todo' },
    });
    expect(res.body.task.position).toBe(1);
  });

  it('404 for an unknown task', async () => {
    const { server, token } = await setup();
    const res = await call(server, 'PATCH', '/tasks/t-nope', { token, body: { title: 'x' } });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it.each([
    ['blank title', { title: ' ' }, 'title'],
    ['long title', { title: 'x'.repeat(201) }, 'title'],
    ['bad description', { description: 5 }, 'description'],
    ['long description', { description: 'x'.repeat(5001) }, 'description'],
    ['bad status', { status: 'nope' }, 'status'],
    ['unknown assignee', { assigneeId: 'u-ghost' }, 'assigneeId'],
  ])('400 for %s', async (_l, body, field) => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token))[0]!;
    const res = await call(server, 'PATCH', `/tasks/${target.id}`, { token, body });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty(field);
    expect((await getTasks(server, token))[0]).toEqual(target);
  });

  it('400 when the body is missing', async () => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token))[0]!;
    expect((await call(server, 'PATCH', `/tasks/${target.id}`, { token })).status).toBe(400);
  });
});

describe('PATCH /tasks/:id/move', () => {
  it('moves across columns, inserting at the position and renumbering both', async () => {
    const { server, token } = await setup();
    const before = await getTasks(server, token);
    const mover = before.find((t) => t.status === 'todo' && t.position === 1)!;
    const res = await call(server, 'PATCH', `/tasks/${mover.id}/move`, {
      token,
      body: { status: 'in_progress', position: 1 },
    });
    expect(res.status).toBe(200);
    const after: Task[] = res.body.tasks;
    expect(after).toHaveLength(12);
    dense(after);
    expect(ids(after, 'in_progress')[1]).toBe(mover.id);
    expect(ids(after, 'todo')).toEqual(ids(before, 'todo').filter((i) => i !== mover.id));
    expect(after.find((t) => t.id === mover.id)!.status).toBe('in_progress');
    expect(await getTasks(server, token)).toEqual(after);
  });

  it('reorders within a column, moving down', async () => {
    const { server, token } = await setup();
    const before = ids(await getTasks(server, token), 'todo');
    const res = await call(server, 'PATCH', `/tasks/${before[0]}/move`, {
      token,
      body: { status: 'todo', position: 2 },
    });
    const expected = [before[1], before[2], before[0], ...before.slice(3)];
    expect(ids(res.body.tasks, 'todo')).toEqual(expected);
    dense(res.body.tasks);
  });

  it('reorders within a column, moving up', async () => {
    const { server, token } = await setup();
    const before = ids(await getTasks(server, token), 'todo');
    const last = before.length - 1;
    const res = await call(server, 'PATCH', `/tasks/${before[last]}/move`, {
      token,
      body: { status: 'todo', position: 0 },
    });
    expect(ids(res.body.tasks, 'todo')).toEqual([before[last], ...before.slice(0, last)]);
    dense(res.body.tasks);
  });

  it('clamps positions past the end', async () => {
    const { server, token } = await setup();
    const before = await getTasks(server, token);
    const mover = before.find((t) => t.status === 'todo')!;
    const res = await call(server, 'PATCH', `/tasks/${mover.id}/move`, {
      token,
      body: { status: 'done', position: 999 },
    });
    const done = ids(res.body.tasks, 'done');
    expect(done[done.length - 1]).toBe(mover.id);
    expect(done).toHaveLength(ids(before, 'done').length + 1);
    dense(res.body.tasks);
  });

  it('moving into an empty column works', async () => {
    const { server, token } = await setup();
    let tasks = await getTasks(server, token);
    for (const t of tasks.filter((x) => x.status === 'done')) {
      await call(server, 'DELETE', `/tasks/${t.id}`, { token });
    }
    tasks = await getTasks(server, token);
    expect(ids(tasks, 'done')).toEqual([]);
    const res = await call(server, 'PATCH', `/tasks/${tasks[0]!.id}/move`, {
      token,
      body: { status: 'done', position: 0 },
    });
    expect(ids(res.body.tasks, 'done')).toEqual([tasks[0]!.id]);
    dense(res.body.tasks);
  });

  it('refreshes updatedAt of the moved task', async () => {
    let t = 1_700_000_000_000;
    const { server } = makeServer({ now: () => t });
    const { token } = await login(server);
    const target = (await getTasks(server, token))[0]!;
    t += 10_000;
    const res = await call(server, 'PATCH', `/tasks/${target.id}/move`, {
      token,
      body: { status: 'done', position: 0 },
    });
    const moved = res.body.tasks.find((x: Task) => x.id === target.id);
    expect(moved.updatedAt).toBe(new Date(t).toISOString());
  });

  it.each([
    ['bad status', { status: 'nope', position: 0 }, 'status'],
    ['missing status', { position: 0 }, 'status'],
    ['negative position', { status: 'todo', position: -1 }, 'position'],
    ['fractional position', { status: 'todo', position: 1.5 }, 'position'],
    ['string position', { status: 'todo', position: '1' }, 'position'],
    ['missing position', { status: 'todo' }, 'position'],
  ])('400 for %s', async (_l, body, field) => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token))[0]!;
    const res = await call(server, 'PATCH', `/tasks/${target.id}/move`, { token, body });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty(field);
  });

  it('400 when the body is missing', async () => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token))[0]!;
    expect((await call(server, 'PATCH', `/tasks/${target.id}/move`, { token })).status).toBe(400);
  });

  it('404 for an unknown task', async () => {
    const { server, token } = await setup();
    const res = await call(server, 'PATCH', '/tasks/t-nope/move', {
      token,
      body: { status: 'todo', position: 0 },
    });
    expect(res.status).toBe(404);
  });

  it('401 without a token', async () => {
    const { server } = await setup();
    const res = await call(server, 'PATCH', '/tasks/t-seed-01/move', {
      body: { status: 'todo', position: 0 },
    });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /tasks/:id', () => {
  it('204 with no body, removes the task and renumbers', async () => {
    const { server, token } = await setup();
    const before = await getTasks(server, token);
    const target = before.find((t) => t.status === 'in_progress' && t.position === 0)!;
    const res = await call(server, 'DELETE', `/tasks/${target.id}`, { token });
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    const after = await getTasks(server, token);
    expect(after).toHaveLength(11);
    expect(after.some((t) => t.id === target.id)).toBe(false);
    dense(after);
  });

  it('404 for an unknown or already deleted task', async () => {
    const { server, token } = await setup();
    const target = (await getTasks(server, token))[0]!;
    expect((await call(server, 'DELETE', `/tasks/${target.id}`, { token })).status).toBe(204);
    const again = await call(server, 'DELETE', `/tasks/${target.id}`, { token });
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('not_found');
  });

  it('401 without a token', async () => {
    const { server } = await setup();
    expect((await call(server, 'DELETE', '/tasks/t-seed-01')).status).toBe(401);
  });
});
