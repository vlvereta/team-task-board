// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { call, login, makeServer } from './testHelpers';

describe('board', () => {
  it('GET /board returns the seeded board with fixed columns', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'GET', '/board', { token });
    expect(res.status).toBe(200);
    expect(res.body.board).toEqual({
      id: 'b-main',
      name: 'Website relaunch',
      columns: [
        { id: 'todo', title: 'To Do' },
        { id: 'in_progress', title: 'In Progress' },
        { id: 'done', title: 'Done' },
      ],
    });
  });

  it('PATCH /board renames and persists', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'PATCH', '/board', { token, body: { name: '  Q3 plan ' } });
    expect(res.status).toBe(200);
    expect(res.body.board.name).toBe('Q3 plan');
    expect((await call(server, 'GET', '/board', { token })).body.board.name).toBe('Q3 plan');
  });

  it.each([
    ['empty', { name: ' ' }],
    ['too long', { name: 'x'.repeat(81) }],
    ['missing', {}],
  ])('PATCH /board 400 for %s name', async (_l, body) => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'PATCH', '/board', { token, body });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('name');
  });

  it('accepts exactly 80 characters', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'PATCH', '/board', { token, body: { name: 'x'.repeat(80) } });
    expect(res.status).toBe(200);
  });

  it('requires auth', async () => {
    const { server } = makeServer();
    expect((await call(server, 'GET', '/board')).status).toBe(401);
    expect((await call(server, 'PATCH', '/board', { body: { name: 'x' } })).status).toBe(401);
  });
});
