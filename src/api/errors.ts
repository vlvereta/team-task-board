import type { ErrorBody, ErrorCode } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields: Record<string, string>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const err = (body as Partial<ErrorBody> | null)?.error;
    if (err && typeof err.message === 'string') {
      return new ApiError(status, err.code ?? 'internal_error', err.message, err.fields ?? {});
    }
    return new ApiError(status, 'internal_error', 'Something went wrong. Please try again.');
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** A user-facing message for any thrown value. */
export function errorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  return 'Something went wrong. Please try again.';
}
