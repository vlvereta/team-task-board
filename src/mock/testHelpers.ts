import type { ApiRequest, ApiResponse, HttpMethod, Transport } from '../api/transport';
import type { Task } from '../api/types';
import { DEMO_PASSWORD } from '../demoAccounts';
import { createMockServer, type MockServerOptions, type StorageLike } from './server';

// Response bodies are checked loosely in tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBody = any;

// The shared jsdom test setup calls localStorage.clear() after each test; in the
// node environment there is no localStorage, so provide an inert one.
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
});

export function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

export function makeServer(options: MockServerOptions = {}) {
  const storage = options.storage ?? memoryStorage();
  const server = createMockServer({
    latency: [0, 0],
    pbkdf2Iterations: 1000,
    ...options,
    storage,
  });
  return { server, storage: storage as ReturnType<typeof memoryStorage> };
}

export function call(
  server: Transport,
  method: HttpMethod,
  path: string,
  opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResponse<AnyBody>> {
  const req: ApiRequest = {
    method,
    path,
    headers: { ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}), ...opts.headers },
    body: opts.body,
  };
  return server.send(req);
}

export async function login(
  server: Transport,
  email = 'ana@crewboard.demo',
  password = DEMO_PASSWORD,
): Promise<{ token: string; id: string }> {
  const res = await call(server, 'POST', '/auth/login', { body: { email, password } });
  return { token: res.body.token, id: res.body.user.id };
}

export async function getTasks(server: Transport, token: string, query = ''): Promise<Task[]> {
  return (await call(server, 'GET', `/tasks${query}`, { token })).body.tasks;
}

/** Asserts positions are dense 0..n-1 within every column. */
export function columnPositions(tasks: Task[]): Record<string, number[]> {
  const out: Record<string, number[]> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) out[t.status]!.push(t.position);
  return out;
}
