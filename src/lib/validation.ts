import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../api/types';

// Client-side checks mirror the server's rules for instant feedback. The
// server stays the authority and its field errors are shown too.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(input: { name: string; email: string; password: string }) {
  const fields: Record<string, string> = {};
  const name = input.name.trim();
  if (!name) fields.name = 'Enter your name.';
  else if (name.length > NAME_MAX_LENGTH)
    fields.name = `Use at most ${NAME_MAX_LENGTH} characters.`;
  const email = input.email.trim();
  if (!email) fields.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email))
    fields.email = 'Enter a valid email address, like name@example.com.';
  if (!input.password) fields.password = 'Enter a password.';
  else if (input.password.length < PASSWORD_MIN_LENGTH)
    fields.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  return fields;
}

export function validateTaskDraft(draft: { title: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.title.trim()) errors.title = 'Give the task a title.';
  return errors;
}

/** A character count shown once text gets close to its limit. */
export function lengthHint(length: number, max: number): string | undefined {
  if (length < max * 0.8) return undefined;
  return length >= max
    ? `${length} / ${max} characters: limit reached.`
    : `${length} / ${max} characters`;
}
