// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { call, login, makeServer } from './testHelpers';

describe('GET /users', () => {
  it('lists users sorted by name, case-insensitively, without secrets', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    await call(server, 'POST', '/auth/register', {
      body: { name: 'bob lowercase', email: 'bob@example.com', password: 'longenough' },
    });
    const res = await call(server, 'GET', '/users', { token });
    expect(res.status).toBe(200);
    const names: string[] = res.body.users.map((u: { name: string }) => u.name);
    expect(names).toEqual([
      'Ana Silva',
      'Ben Okafor',
      'bob lowercase',
      'Chloé Martin',
      'Dev Patel',
      'Emma Novak',
    ]);
    for (const u of res.body.users) {
      expect(u).not.toHaveProperty('passwordHash');
      expect(u).not.toHaveProperty('salt');
      expect(u).not.toHaveProperty('iterations');
    }
  });

  it('requires auth', async () => {
    const { server } = makeServer();
    expect((await call(server, 'GET', '/users')).status).toBe(401);
  });
});

describe('PATCH /users/me and /users/:id', () => {
  it('updates the own name via /users/me', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'PATCH', '/users/me', { token, body: { name: '  Ana S.  ' } });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Ana S.');
    const me = await call(server, 'GET', '/auth/me', { token });
    expect(me.body.user.name).toBe('Ana S.');
  });

  it('updates the own name via /users/:id', async () => {
    const { server } = makeServer();
    const { token, id } = await login(server);
    const res = await call(server, 'PATCH', `/users/${id}`, { token, body: { name: 'New' } });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New');
  });

  it('403 for another existing user', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'PATCH', '/users/u-ben', { token, body: { name: 'Hax' } });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
    const list = await call(server, 'GET', '/users', { token });
    expect(list.body.users.map((u: { name: string }) => u.name)).toContain('Ben Okafor');
  });

  it('404 for an unknown user', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'PATCH', '/users/u-nope', { token, body: { name: 'X' } });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it.each([
    ['empty', { name: '   ' }],
    ['too long', { name: 'x'.repeat(61) }],
    ['missing', {}],
    ['not a string', { name: 5 }],
  ])('400 for %s name', async (_l, body) => {
    const { server } = makeServer();
    const { token } = await login(server);
    const res = await call(server, 'PATCH', '/users/me', { token, body });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('name');
  });

  it('400 when body is missing', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    expect((await call(server, 'PATCH', '/users/me', { token })).status).toBe(400);
  });

  it('401 without a token', async () => {
    const { server } = makeServer();
    expect((await call(server, 'PATCH', '/users/me', { body: { name: 'X' } })).status).toBe(401);
  });
});
