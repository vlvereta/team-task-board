import type { ApiRequest, ApiResponse, Transport } from '../api/transport';
import { ok, type Ctx, type Handler } from './context';
import { verifyToken } from './crypto';
import { HttpError, errorResponse, internalError, notFound, unauthorized } from './errors';
import { login, me, register } from './handlers/auth';
import { getBoard, patchBoard } from './handlers/board';
import { resetDemo } from './handlers/demo';
import { createTask, deleteTask, listTasks, moveTask, patchTask } from './handlers/tasks';
import { listUsers, patchUser } from './handlers/users';
import { matchRoute, parsePath, type Route } from './router';
import { createStore, STORAGE_KEY, type StorageLike } from './store';

export { STORAGE_KEY };
export type { StorageLike };

export interface MockServerOptions {
  storage?: StorageLike;
  /** Delay range in ms; `[0, 0]` skips timers entirely. Default `[150, 400]`. */
  latency?: [number, number];
  /** When it returns true the request gets a 500 `internal_error` (after latency). */
  shouldFail?: (req: ApiRequest) => boolean;
  tokenTtlMs?: number;
  pbkdf2Iterations?: number;
  now?: () => number;
}

const routes: Route<Handler>[] = [
  { method: 'POST', pattern: '/auth/register', auth: false, handler: register },
  { method: 'POST', pattern: '/auth/login', auth: false, handler: login },
  { method: 'GET', pattern: '/auth/me', auth: true, handler: me },
  { method: 'GET', pattern: '/users', auth: true, handler: listUsers },
  { method: 'PATCH', pattern: '/users/me', auth: true, handler: patchUser },
  { method: 'PATCH', pattern: '/users/:id', auth: true, handler: patchUser },
  { method: 'GET', pattern: '/board', auth: true, handler: getBoard },
  { method: 'PATCH', pattern: '/board', auth: true, handler: patchBoard },
  { method: 'GET', pattern: '/tasks', auth: true, handler: listTasks },
  { method: 'POST', pattern: '/tasks', auth: true, handler: createTask },
  { method: 'PATCH', pattern: '/tasks/:id/move', auth: true, handler: moveTask },
  { method: 'PATCH', pattern: '/tasks/:id', auth: true, handler: patchTask },
  { method: 'DELETE', pattern: '/tasks/:id', auth: true, handler: deleteTask },
  { method: 'POST', pattern: '/demo/reset', auth: true, handler: resetDemo },
];

function bearerToken(req: ApiRequest): string | null {
  const key = Object.keys(req.headers).find((k) => k.toLowerCase() === 'authorization');
  const value = key === undefined ? undefined : req.headers[key];
  if (typeof value !== 'string') return null;
  const m = /^Bearer (\S+)$/.exec(value.trim());
  return m ? (m[1] as string) : null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createMockServer(options: MockServerOptions = {}): Transport {
  const now = options.now ?? Date.now;
  const [minLatency, maxLatency] = options.latency ?? [150, 400];
  const tokenTtlMs = options.tokenTtlMs ?? 12 * 60 * 60 * 1000;
  const iterations = options.pbkdf2Iterations ?? 100_000;
  const storage = options.storage ?? globalThis.localStorage;
  const store = createStore(storage, now, iterations);

  async function handle(req: ApiRequest): Promise<ApiResponse> {
    if (maxLatency > 0) {
      const delay = minLatency + Math.random() * (maxLatency - minLatency);
      if (delay > 0) await sleep(delay);
    }
    if (options.shouldFail?.(req)) {
      return errorResponse(new HttpError(500, 'internal_error', 'Simulated server failure.'));
    }

    const { pathname, query } = parsePath(req.path);
    const match = matchRoute(routes, req.method, pathname);
    if (!match) return errorResponse(notFound('No such endpoint.'));

    const db = await store.load();
    let userId = '';
    if (match.route.auth) {
      const token = bearerToken(req);
      if (token === null) throw unauthorized();
      const payload = await verifyToken(token, db.secret);
      if (!payload || payload.exp * 1000 <= now()) throw unauthorized('Your session has expired.');
      if (!db.users.some((u) => u.id === payload.sub)) throw unauthorized();
      userId = payload.sub;
    }

    const ctx: Ctx = {
      req,
      params: match.params,
      query,
      body: req.body,
      db,
      userId,
      store,
      now,
      iterations,
      tokenTtlMs,
    };
    const res = await match.route.handler(ctx);
    return res.status === 204
      ? { status: 204, body: null }
      : structuredClone(ok(res.body, res.status));
  }

  return {
    async send(req) {
      try {
        return await handle(req);
      } catch (err) {
        if (err instanceof HttpError) return errorResponse(err);
        return internalError();
      }
    },
  };
}
