import {
  portErrorReason,
  type PortErrorCode,
  type PortResult,
} from '@oequ/ports';
import type { AuthError, PostgrestError } from '@supabase/supabase-js';

export function supabaseErr<T>(
  code: PortErrorCode,
  reason: string,
  params?: Record<string, unknown>,
): PortResult<T> {
  return { ok: false, error: portErrorReason(code, reason, params) };
}

export function supabaseErrFromAuth<T>(error: AuthError): PortResult<T> {
  const code = mapAuthErrorCode(error);
  const reason = mapAuthErrorReason(error);
  return {
    ok: false,
    error: portErrorReason(code, reason, undefined, error.message),
  };
}

export function supabaseErrFromPostgrest<T>(
  error: PostgrestError,
): PortResult<T> {
  const code: PortErrorCode =
    error.code === 'PGRST116'
      ? 'NOT_FOUND'
      : error.code === '42501'
        ? 'FORBIDDEN'
        : 'UNKNOWN';
  return {
    ok: false,
    error: portErrorReason(code, 'supabaseQueryFailed', { message: error.message }),
  };
}

function mapAuthErrorCode(error: AuthError): PortErrorCode {
  const status = error.status ?? 0;
  if (status === 400 || error.code === 'validation_failed') {
    return 'VALIDATION';
  }
  if (status === 401) {
    return 'UNAUTHENTICATED';
  }
  if (status === 403) {
    return 'FORBIDDEN';
  }
  if (status === 422) {
    return 'VALIDATION';
  }
  if (status === 429) {
    return 'RATE_LIMITED';
  }
  return 'UNKNOWN';
}

function mapAuthErrorReason(error: AuthError): string {
  if (error.message.toLowerCase().includes('invalid login credentials')) {
    return 'invalidCredentials';
  }
  if (error.message.toLowerCase().includes('already registered')) {
    return 'emailExists';
  }
  return 'authFailed';
}
