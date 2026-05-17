/** Stable error surface for all port adapters (HTTP, Supabase, mock). */
export type PortErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'SEATS_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export interface PortError {
  readonly code: PortErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export type PortResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: PortError };

export function portOk<T>(data: T): PortResult<T> {
  return { ok: true, data };
}

export function portErr<T>(error: PortError): PortResult<T> {
  return { ok: false, error };
}

export function portError(
  code: PortErrorCode,
  message: string,
  cause?: unknown,
): PortError {
  return { code, message, cause };
}
