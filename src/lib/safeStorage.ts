// Browsers can refuse access to localStorage (e.g. "block all site data").
// Touching it then throws, which would leave a blank page. Fall back to an
// in-memory store for this tab and let the UI say that nothing will be kept.

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function resolve(): { storage: StorageLike; persistent: boolean } {
  try {
    const ls = window.localStorage;
    const probe = '__crewboard_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { storage: ls, persistent: true };
  } catch {
    return { storage: memoryStorage(), persistent: false };
  }
}

const resolved = resolve();

/** localStorage when available, otherwise an in-memory store for this tab. */
export const appStorage: StorageLike = resolved.storage;
/** False when the browser blocks storage and data only lasts until the tab closes. */
export const storagePersistent: boolean = resolved.persistent;
