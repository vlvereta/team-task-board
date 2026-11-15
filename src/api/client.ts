import { ApiError } from './errors';
import type { HttpMethod, Transport } from './transport';
import type {
  AuthResult,
  Board,
  CreateTaskInput,
  LoginInput,
  MoveTaskInput,
  RegisterInput,
  Task,
  UpdateTaskInput,
  User,
} from './types';

export interface ApiClientOptions {
  transport: Transport;
  getToken: () => string | null;
  /** Called on any 401 from an authenticated request (expired or invalid session). */
  onUnauthorized?: () => void;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient({ transport, getToken, onUnauthorized }: ApiClientOptions) {
  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    auth = true,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    let res;
    try {
      res = await transport.send({ method, path, headers, body });
    } catch {
      throw new ApiError(
        0,
        'internal_error',
        'Could not reach the server. Check your connection and try again.',
      );
    }
    if (res.status >= 200 && res.status < 300) return res.body as T;
    const error = ApiError.fromResponse(res.status, res.body);
    if (auth && res.status === 401) onUnauthorized?.();
    throw error;
  }

  const enc = encodeURIComponent;

  return {
    auth: {
      register: (input: RegisterInput) =>
        request<AuthResult>('POST', '/auth/register', input, false),
      login: (input: LoginInput) => request<AuthResult>('POST', '/auth/login', input, false),
      me: () => request<{ user: User }>('GET', '/auth/me').then((r) => r.user),
    },
    users: {
      list: () => request<{ users: User[] }>('GET', '/users').then((r) => r.users),
      updateMe: (input: { name: string }) =>
        request<{ user: User }>('PATCH', '/users/me', input).then((r) => r.user),
    },
    board: {
      get: () => request<{ board: Board }>('GET', '/board').then((r) => r.board),
      rename: (name: string) =>
        request<{ board: Board }>('PATCH', '/board', { name }).then((r) => r.board),
    },
    tasks: {
      list: (filter?: { assignee?: 'me' | string }) =>
        request<{ tasks: Task[] }>(
          'GET',
          filter?.assignee ? `/tasks?assignee=${enc(filter.assignee)}` : '/tasks',
        ).then((r) => r.tasks),
      create: (input: CreateTaskInput) =>
        request<{ task: Task }>('POST', '/tasks', input).then((r) => r.task),
      update: (id: string, input: UpdateTaskInput) =>
        request<{ task: Task }>('PATCH', `/tasks/${enc(id)}`, input).then((r) => r.task),
      move: (id: string, input: MoveTaskInput) =>
        request<{ tasks: Task[] }>('PATCH', `/tasks/${enc(id)}/move`, input).then((r) => r.tasks),
      remove: (id: string) => request<null>('DELETE', `/tasks/${enc(id)}`).then(() => undefined),
    },
    demo: {
      reset: () => request<{ ok: true }>('POST', '/demo/reset').then(() => undefined),
    },
  };
}
