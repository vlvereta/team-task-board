import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TASK_STATUSES,
  TITLE_MAX_LENGTH,
  type TaskStatus,
} from '../api/types';
import { validationError } from './errors';

type Fields = Record<string, string>;

export function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError(undefined, 'Request body must be a JSON object.');
  }
  return body as Record<string, unknown>;
}

export function throwIfAny(fields: Fields): void {
  if (Object.keys(fields).length > 0) throw validationError(fields);
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function checkName(value: unknown, max = NAME_MAX_LENGTH): string | { error: string } {
  if (typeof value !== 'string' || value.trim() === '') return { error: 'Enter a name.' };
  const v = value.trim();
  if (v.length > max) return { error: `Use at most ${max} characters.` };
  return v;
}

export function checkEmail(value: unknown): string | { error: string } {
  if (typeof value !== 'string' || value.trim() === '')
    return { error: 'Enter your email address.' };
  const v = value.trim().toLowerCase();
  if (v.length > 254 || !EMAIL_RE.test(v)) return { error: 'Enter a valid email address.' };
  return v;
}

export function checkPassword(value: unknown): string | { error: string } {
  if (typeof value !== 'string' || value === '') return { error: 'Enter a password.' };
  if (value.trim() === '') return { error: 'A password cannot be only spaces.' };
  if (value.length < PASSWORD_MIN_LENGTH) {
    return { error: `Use at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  return value;
}

export function checkTitle(value: unknown): string | { error: string } {
  if (typeof value !== 'string' || value.trim() === '') return { error: 'Enter a title.' };
  const v = value.trim();
  if (v.length > TITLE_MAX_LENGTH) return { error: `Use at most ${TITLE_MAX_LENGTH} characters.` };
  return v;
}

export function checkDescription(value: unknown): string | { error: string } {
  if (typeof value !== 'string') return { error: 'Description must be text.' };
  const v = value.trim();
  if (v.length > DESCRIPTION_MAX_LENGTH) {
    return { error: `Use at most ${DESCRIPTION_MAX_LENGTH} characters.` };
  }
  return v;
}

export function isStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

export function checkAssignee(
  value: unknown,
  userExists: (id: string) => boolean,
): string | null | { error: string } {
  if (value === null) return null;
  if (typeof value !== 'string' || !userExists(value)) return { error: 'Choose an existing user.' };
  return value;
}

export function isErr<T>(v: T | { error: string }): v is { error: string } {
  return typeof v === 'object' && v !== null && 'error' in v;
}
