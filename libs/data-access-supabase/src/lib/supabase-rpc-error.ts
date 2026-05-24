import {
  portErrorReason,
  type PortErrorCode,
  type PortResult,
} from '@oequ/ports';
import type { PostgrestError } from '@supabase/supabase-js';

export function supabaseErrFromRpc<T>(error: PostgrestError): PortResult<T> {
  const message = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';

  if (code === '23505') {
    if (message.includes('slug')) {
      return {
        ok: false,
        error: portErrorReason('CONFLICT', 'workspaceSlugTaken'),
      };
    }
    return {
      ok: false,
      error: portErrorReason('CONFLICT', 'inviteConflict'),
    };
  }

  if (code === '42501' || message.includes('forbidden')) {
    return {
      ok: false,
      error: portErrorReason('FORBIDDEN', 'forbidden'),
    };
  }

  if (
    code === '28000' ||
    message.includes('not authenticated') ||
    message.includes('session stale')
  ) {
    return {
      ok: false,
      error: portErrorReason(
        'UNAUTHENTICATED',
        message.includes('session stale') ? 'sessionStale' : 'notSignedIn',
      ),
    };
  }

  if (code === '23503' && message.includes('user_id')) {
    return {
      ok: false,
      error: portErrorReason('UNAUTHENTICATED', 'sessionStale'),
    };
  }

  if (code === 'P0001' && message.includes('seats exhausted')) {
    return {
      ok: false,
      error: portErrorReason('SEATS_EXHAUSTED', 'seatsExhausted'),
    };
  }

  if (code === 'P0001' && message.includes('monthly email quota')) {
    return {
      ok: false,
      error: portErrorReason('RATE_LIMITED', 'emailQuotaMonthly'),
    };
  }

  if (code === 'P0001' && message.includes('daily email quota')) {
    return {
      ok: false,
      error: portErrorReason('RATE_LIMITED', 'emailQuotaDaily'),
    };
  }

  if (code === 'P0001' && message.includes('email quota')) {
    return {
      ok: false,
      error: portErrorReason('RATE_LIMITED', 'emailQuotaExceeded'),
    };
  }

  if (code === '22023') {
    if (message.includes('slug')) {
      return {
        ok: false,
        error: portErrorReason('VALIDATION', 'workspaceSlugInvalid'),
      };
    }
    if (message.includes('name')) {
      return {
        ok: false,
        error: portErrorReason('VALIDATION', 'workspaceNameInvalid'),
      };
    }
    if (message.includes('email')) {
      return {
        ok: false,
        error: portErrorReason('VALIDATION', 'invalidInviteEmail'),
    };
    }
    if (message.includes('role')) {
      return {
        ok: false,
        error: portErrorReason('VALIDATION', 'invalidMemberRole'),
      };
    }
    if (message.includes('api key not found')) {
      return {
        ok: false,
        error: portErrorReason('NOT_FOUND', 'apiKeyNotFound'),
      };
    }
    if (message.includes('api key name')) {
      return {
        ok: false,
        error: portErrorReason('VALIDATION', 'apiKeyNameRequired'),
      };
    }
  }

  const portCode: PortErrorCode = 'UNKNOWN';
  return {
    ok: false,
    error: portErrorReason(portCode, 'supabaseQueryFailed', {
      message: error.message,
    }),
  };
}
