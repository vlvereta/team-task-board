import type { HttpMethod } from '../api/transport';

export interface Route<H> {
  method: HttpMethod;
  pattern: string;
  /** Whether a valid bearer token is required. */
  auth: boolean;
  handler: H;
}

export interface Match<H> {
  route: Route<H>;
  params: Record<string, string>;
}

export function parsePath(path: string): { pathname: string; query: Record<string, string> } {
  const qIndex = path.indexOf('?');
  const pathname = qIndex === -1 ? path : path.slice(0, qIndex);
  const query: Record<string, string> = {};
  if (qIndex !== -1) {
    for (const [k, v] of new URLSearchParams(path.slice(qIndex + 1))) query[k] = v;
  }
  return { pathname, query };
}

const segments = (p: string) => p.split('/').filter(Boolean);

export function matchRoute<H>(
  routes: Route<H>[],
  method: HttpMethod,
  pathname: string,
): Match<H> | null {
  const parts = segments(pathname);
  for (const route of routes) {
    if (route.method !== method) continue;
    const pattern = segments(route.pattern);
    if (pattern.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = pattern.every((seg, i) => {
      const part = parts[i] as string;
      if (seg.startsWith(':')) {
        try {
          params[seg.slice(1)] = decodeURIComponent(part);
        } catch {
          return false;
        }
        return true;
      }
      return seg === part;
    });
    if (ok) return { route, params };
  }
  return null;
}
