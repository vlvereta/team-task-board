// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ACCOUNTS } from '../demoAccounts';
import { STORAGE_KEY, createMockServer } from './server';
import { call, getTasks, login, makeServer, memoryStorage } from './testHelpers';

afterEach(() => vi.useRealTimers());

describe('seed', () => {
  it('writes five demo users, one board and 10-12 tasks on first request', async () => {
    const { server, storage } = makeServer();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    const { token } = await login(server);
    const db = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(db.schemaVersion).toBe(1);
    expect(db.secret).toEqual(expect.any(String));
    expect(db.users).toHaveLength(5);
    expect(db.users.map((u: { id: string }) => u.id).sort()).toEqual(
      DEMO_ACCOUNTS.map((a) => a.id).sort(),
    );
    const tasks = await getTasks(server, token);
    expect(tasks.length).toBeGreaterThanOrEqual(10);
    expect(tasks.length).toBeLessThanOrEqual(12);
    for (const s of ['todo', 'in_progress', 'done']) {
      expect(tasks.some((t) => t.status === s)).toBe(true);
    }
    expect(tasks.filter((t) => t.assigneeId === null).length).toBeGreaterThanOrEqual(2);
    expect(new Set(tasks.map((t) => t.assigneeId).filter(Boolean)).size).toBeGreaterThanOrEqual(3);
    expect(tasks.some((t) => t.description.split('. ').length > 1)).toBe(true);
  });

  it('can log in as every demo account', async () => {
    const { server } = makeServer();
    for (const a of DEMO_ACCOUNTS) {
      const res = await call(server, 'POST', '/auth/login', {
        body: { email: a.email, password: 'demo1234' },
      });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: a.id, name: a.name, avatarColor: a.avatarColor });
    }
  });

  it('only seeds on the first visit: changes persist across server instances', async () => {
    const storage = memoryStorage();
    const a = makeServer({ storage }).server;
    const { token } = await login(a);
    await call(a, 'POST', '/tasks', { token, body: { title: 'Persisted' } });
    await call(a, 'PATCH', '/board', { token, body: { name: 'Renamed' } });

    const b = makeServer({ storage }).server;
    const again = await login(b);
    expect((await getTasks(b, again.token)).some((t) => t.title === 'Persisted')).toBe(true);
    expect((await call(b, 'GET', '/board', { token: again.token })).body.board.name).toBe(
      'Renamed',
    );
    // Tokens issued by the first instance still work on the second (shared secret).
    expect((await call(b, 'GET', '/auth/me', { token })).status).toBe(200);
  });

  it('re-reads storage on every request', async () => {
    const storage = memoryStorage();
    const a = makeServer({ storage }).server;
    const b = makeServer({ storage }).server;
    const { token } = await login(a);
    await call(a, 'PATCH', '/board', { token, body: { name: 'From A' } });
    expect((await call(b, 'GET', '/board', { token })).body.board.name).toBe('From A');
  });

  it('reseeds when the stored JSON is corrupt', async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{not json' });
    const { server } = makeServer({ storage });
    const { token } = await login(server);
    expect(await getTasks(server, token)).toHaveLength(12);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).schemaVersion).toBe(1);
  });

  it('reseeds on another schemaVersion', async () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ schemaVersion: 99, users: [], tasks: [] }),
    });
    const { server } = makeServer({ storage });
    const { token } = await login(server);
    expect(await getTasks(server, token)).toHaveLength(12);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).schemaVersion).toBe(1);
  });

  it('reseeds when the shape is wrong (valid JSON, right version)', async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1 }) });
    const { server } = makeServer({ storage });
    const { token } = await login(server);
    expect(await getTasks(server, token)).toHaveLength(12);
  });

  it('concurrent first requests share one seed', async () => {
    const storage = memoryStorage();
    let writes = 0;
    const counting = {
      getItem: (k: string) => storage.getItem(k),
      setItem: (k: string, v: string) => {
        writes++;
        storage.setItem(k, v);
      },
      removeItem: (k: string) => storage.removeItem(k),
    };
    const { server } = makeServer({ storage: counting });
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        call(server, 'POST', '/auth/login', {
          body: { email: 'ana@crewboard.demo', password: 'demo1234' },
        }),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(writes).toBe(1);
  });

  it('stores no plain-text password anywhere', async () => {
    const { server, storage } = makeServer();
    await login(server);
    expect(storage.getItem(STORAGE_KEY)).not.toContain('demo1234');
  });
});

describe('POST /demo/reset', () => {
  it('restores the seed, removes new users and keeps demo tokens valid', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    const reg = await call(server, 'POST', '/auth/register', {
      body: { name: 'Temp', email: 'temp@example.com', password: 'longenough' },
    });
    expect(reg.status).toBe(201);
    const original = await getTasks(server, token);
    await call(server, 'POST', '/tasks', { token, body: { title: 'Extra' } });
    await call(server, 'DELETE', `/tasks/${original[0]!.id}`, { token });
    await call(server, 'PATCH', '/board', { token, body: { name: 'Changed' } });
    await call(server, 'PATCH', '/users/me', { token, body: { name: 'Changed Name' } });

    const res = await call(server, 'POST', '/demo/reset', { token });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const users = (await call(server, 'GET', '/users', { token })).body.users;
    expect(users).toHaveLength(5);
    expect(users.map((u: { name: string }) => u.name)).toContain('Ana Silva');
    const tasks = await getTasks(server, token);
    expect(tasks).toHaveLength(12);
    expect(tasks.map((t) => t.title).sort()).toEqual(original.map((t) => t.title).sort());
    expect((await call(server, 'GET', '/board', { token })).body.board.name).toBe(
      'Website relaunch',
    );
    expect((await call(server, 'GET', '/auth/me', { token: reg.body.token })).status).toBe(401);
    expect(
      (
        await call(server, 'POST', '/auth/login', {
          body: { email: 'temp@example.com', password: 'longenough' },
        })
      ).status,
    ).toBe(401);
    expect((await login(server)).token).toEqual(expect.any(String));
  });

  it('requires auth', async () => {
    const { server } = makeServer();
    expect((await call(server, 'POST', '/demo/reset')).status).toBe(401);
  });
});

describe('server behaviour', () => {
  it('unknown routes and methods give 404 not_found', async () => {
    const { server } = makeServer();
    const { token } = await login(server);
    for (const [method, path] of [
      ['GET', '/nope'],
      ['GET', '/tasks/t-1/move'],
      ['PUT' as never, '/tasks'],
      ['DELETE', '/board'],
      ['GET', '/auth/login'],
    ] as const) {
      const res = await call(server, method, path, { token });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    }
  });

  it('unknown routes are 404 even without a token', async () => {
    const { server } = makeServer();
    expect((await call(server, 'GET', '/nope')).status).toBe(404);
  });

  it('every error body has code and message', async () => {
    const { server } = makeServer();
    const res = await call(server, 'GET', '/tasks');
    expect(res.body).toEqual({
      error: { code: 'unauthorized', message: expect.any(String) },
    });
  });

  it('shouldFail returns 500 internal_error', async () => {
    const { server } = makeServer({
      shouldFail: (req) => req.method === 'PATCH' && /\/move$/.test(req.path),
    });
    const { token } = await login(server);
    const target = (await getTasks(server, token))[0]!;
    const res = await call(server, 'PATCH', `/tasks/${target.id}/move`, {
      token,
      body: { status: 'done', position: 0 },
    });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
    expect((await getTasks(server, token))[0]).toEqual(target);
    expect((await call(server, 'GET', '/board', { token })).status).toBe(200);
  });

  it('never throws out of send: storage failures become 500', async () => {
    const storage = memoryStorage();
    const { server } = makeServer({ storage });
    const { token } = await login(server);
    storage.setItem = () => {
      throw new Error('quota exceeded');
    };
    const res = await call(server, 'POST', '/tasks', { token, body: { title: 'x' } });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
  });

  it('latency [0,0] does not use timers', async () => {
    vi.useFakeTimers();
    const { server } = makeServer({ latency: [0, 0] });
    const res = await call(server, 'POST', '/auth/login', {
      body: { email: 'ana@crewboard.demo', password: 'demo1234' },
    });
    expect(res.status).toBe(200);
  });

  it('applies the configured latency', async () => {
    vi.useFakeTimers();
    const server = createMockServer({
      storage: memoryStorage(),
      latency: [200, 300],
      pbkdf2Iterations: 1000,
    });
    let done = false;
    const p = call(server, 'GET', '/nope').then((r) => {
      done = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(199);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(101);
    expect((await p).status).toBe(404);
  });

  it('applies latency to shouldFail responses too', async () => {
    vi.useFakeTimers();
    const server = createMockServer({
      storage: memoryStorage(),
      latency: [100, 100],
      shouldFail: () => true,
    });
    let done = false;
    const p = call(server, 'GET', '/board').then((r) => {
      done = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await p).status).toBe(500);
  });

  it('stores a write before the delayed response arrives (a reload mid-request keeps it)', async () => {
    const storage = memoryStorage();
    const fast = createMockServer({ storage, latency: [0, 0], pbkdf2Iterations: 1000 });
    const { token } = await login(fast);
    // Real timers: token checks use real async crypto.
    const slow = createMockServer({ storage, latency: [400, 400], pbkdf2Iterations: 1000 });
    const started = Date.now();
    const pending = call(slow, 'POST', '/tasks', { token, body: { title: 'Saved early' } });
    await vi.waitFor(() => expect(storage.getItem(STORAGE_KEY)).toContain('Saved early'), {
      timeout: 300,
      interval: 5,
    });
    expect(Date.now() - started).toBeLessThan(350);
    expect((await pending).status).toBe(201);
  });

  it('processes concurrent writes one at a time (no lost updates)', async () => {
    const { server } = makeServer({ latency: [0, 0] });
    const { token } = await login(server);
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        call(server, 'POST', '/tasks', { token, body: { title: `Parallel ${i}` } }),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    const tasks = await getTasks(server, token);
    expect(tasks.filter((t) => t.title.startsWith('Parallel'))).toHaveLength(5);
  });
});
