import type { ApiRequest, ApiResponse } from '../api/transport';
import type { Db } from './db';
import type { Store } from './store';

export interface Ctx {
  req: ApiRequest;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  /** Snapshot read at the start of the request; mutate it and call `store.save`. */
  db: Db;
  /** Id of the authenticated user; empty string on unauthenticated routes. */
  userId: string;
  store: Store;
  now: () => number;
  iterations: number;
  tokenTtlMs: number;
}

export type Handler = (ctx: Ctx) => Promise<ApiResponse> | ApiResponse;

export const ok = (body: unknown, status = 200): ApiResponse => ({ status, body });
