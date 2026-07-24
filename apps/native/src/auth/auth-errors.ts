import type { AuthError } from '@supabase/supabase-js';

/** User-facing English copy (repo language). Mirrors web auth reason mapping. */
export function messageFromAuthError(error: AuthError): string {
  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Check your inbox for a code.';
  }
  if (message.includes('already registered')) {
    return 'An account with this email already exists.';
  }
  if (
    message.includes('rate limit') ||
    message.includes('over_email_send_rate_limit') ||
    error.status === 429
  ) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (
    message.includes('password') &&
    (message.includes('weak') ||
      message.includes('short') ||
      message.includes('at least'))
  ) {
    return 'Password must be at least 8 characters.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  return error.message || 'Something went wrong. Please try again.';
}

export function isEmailNotConfirmedError(error: AuthError): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('email not confirmed') ||
    error.code === 'email_not_confirmed'
  );
}

export function messageFromAuthReason(reason: string): string {
  switch (reason) {
    case 'invalidCredentials':
      return 'Invalid email or password.';
    case 'emailExists':
      return 'An account with this email already exists.';
    case 'passwordTooShort':
      return 'Password must be at least 8 characters.';
    case 'termsRequired':
      return 'Accept the terms and privacy policy to continue.';
    case 'emailConfirmationRequired':
    case 'emailNotConfirmed':
      return 'Check your email for a 6-digit confirmation code.';
    case 'emailConfirmationOtpInvalid':
      return 'Invalid or expired confirmation code.';
    case 'rateLimited':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'notConfigured':
      return 'Supabase is not configured.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
