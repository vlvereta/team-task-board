// Composition root: the only place that decides which transport the app uses.
// To talk to a real backend, replace `createMockServer(...)` with
// `createFetchTransport(import.meta.env.VITE_API_URL)`. Nothing else changes.
import { createApiClient } from '../api/client';
import { tokenStore } from '../api/token';
import { createMockServer } from '../mock/server';

function parseLatency(raw: string | undefined): [number, number] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(',').map((n) => Number(n.trim()));
  const min = parts[0] ?? NaN;
  const max = parts[1] ?? min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
  return [min, max];
}

function failMovesRequested(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('failMoves') === '1';
  } catch {
    return false;
  }
}

const transport = createMockServer({
  latency: parseLatency(import.meta.env.VITE_MOCK_LATENCY),
  shouldFail: (req) =>
    req.method === 'PATCH' && /^\/tasks\/[^/]+\/move$/.test(req.path) && failMovesRequested(),
});

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export const api = createApiClient({
  transport,
  getToken: tokenStore.get,
  onUnauthorized: () => unauthorizedListeners.forEach((l) => l()),
});
