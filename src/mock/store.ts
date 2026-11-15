import { isDb, type Db } from './db';
import { createSeed } from './seed';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const STORAGE_KEY = 'crewboard:db';

export interface Store {
  /** Reads the DB fresh from storage, seeding first when it is missing or invalid. */
  load(): Promise<Db>;
  save(db: Db): void;
  /** Replaces everything with the seed, keeping the existing secret. */
  reset(secret: string): Promise<Db>;
}

export function createStore(storage: StorageLike, now: () => number, iterations: number): Store {
  function read(): Db | null {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isDb(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  const save = (db: Db) => storage.setItem(STORAGE_KEY, JSON.stringify(db));

  // Memoised so concurrent first requests share one seeding run.
  let seeding: Promise<Db> | null = null;

  async function load(): Promise<Db> {
    const existing = read();
    if (existing) return existing;
    seeding ??= createSeed({ now: now(), iterations })
      .then((seed) => {
        const raced = read();
        if (raced) return raced;
        save(seed);
        return seed;
      })
      .finally(() => {
        seeding = null;
      });
    return seeding;
  }

  async function reset(secret: string): Promise<Db> {
    const seed = await createSeed({ now: now(), iterations, secret });
    save(seed);
    return seed;
  }

  return { load, save, reset };
}
