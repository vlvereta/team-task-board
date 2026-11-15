import type { ApiResponse } from '../api/transport';
import type { ErrorBody, ErrorCode } from '../api/types';

/** Thrown by handlers; converted to an error response by the server. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const validationError = (fields?: Record<string, string>, message?: string) =>
  new HttpError(400, 'validation_error', message ?? 'Please fix the highlighted fields.', fields);

export const unauthorized = (message = 'Please sign in to continue.') =>
  new HttpError(401, 'unauthorized', message);

export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);

export function errorResponse(err: HttpError): ApiResponse<ErrorBody> {
  const error: ErrorBody['error'] = { code: err.code, message: err.message };
  if (err.fields && Object.keys(err.fields).length > 0) error.fields = err.fields;
  return { status: err.status, body: { error } };
}

export function internalError(): ApiResponse<ErrorBody> {
  return errorResponse(
    new HttpError(500, 'internal_error', 'Something went wrong. Please try again.'),
  );
}
