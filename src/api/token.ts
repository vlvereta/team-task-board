// The auth token is the one thing the client keeps in storage itself.
// Domain data is only ever read and written by the server behind the transport.
import { appStorage } from '../lib/safeStorage';

const TOKEN_KEY = 'crewboard:token';

export const tokenStore = {
  get(): string | null {
    try {
      return appStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      appStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage full or unavailable: nothing more we can do */
    }
  },
  clear(): void {
    try {
      appStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};
