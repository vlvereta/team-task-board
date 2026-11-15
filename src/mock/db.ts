import type { Task, User } from '../api/types';

export const SCHEMA_VERSION = 1;

/** A user as stored: public fields plus password material that never leaves the server. */
export interface DbUser extends User {
  passwordHash: string;
  salt: string;
  iterations: number;
}

export interface Db {
  schemaVersion: typeof SCHEMA_VERSION;
  secret: string;
  users: DbUser[];
  board: { id: string; name: string };
  tasks: Task[];
}

export function isDb(value: unknown): value is Db {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const board = v['board'] as Record<string, unknown> | null | undefined;
  return (
    v['schemaVersion'] === SCHEMA_VERSION &&
    typeof v['secret'] === 'string' &&
    Array.isArray(v['users']) &&
    Array.isArray(v['tasks']) &&
    typeof board === 'object' &&
    board !== null &&
    typeof board['id'] === 'string' &&
    typeof board['name'] === 'string'
  );
}

export function toPublicUser(u: DbUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt,
  };
}
