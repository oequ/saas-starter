import type { Session, User } from '@supabase/supabase-js';
import {
  getSupabase,
  requireEmailConfirmation,
  supabaseConfigErrorMessage,
  supabaseConfigured,
} from '../lib/supabase';
import { messageFromAuthError, messageFromAuthReason, isEmailNotConfirmedError } from './auth-errors';
import type {
  AuthResult,
  AuthSession,
  AuthUser,
  SignUpResult,
} from './auth-types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mapUser(user: User): AuthUser {
  const email = user.email ?? '';
  const metaName =
    typeof user.user_metadata?.['display_name'] === 'string'
      ? user.user_metadata['display_name']
      : typeof user.user_metadata?.['full_name'] === 'string'
        ? user.user_metadata['full_name']
        : '';
  const displayName =
    metaName.trim() ||
    (email.includes('@') ? email.split('@')[0]! : 'Account');
  return { id: user.id, email, displayName };
}

export function mapSession(session: Session): AuthSession {
  return { user: mapUser(session.user) };
}

async function afterSignIn(): Promise<void> {
  const client = getSupabase();
  if (!client) {
    return;
  }
  // Same as web adapter — claim pending org invitations after auth.
  try {
    await client.rpc('claim_my_invitations');
  } catch {
    // Non-fatal on companion; org surfaces come later.
  }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!supabaseConfigured) {
    return { ok: false, message: supabaseConfigErrorMessage(), code: 'notConfigured' };
  }
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, message: 'Enter a valid email address.', code: 'validation' };
  }
  if (!password) {
    return { ok: false, message: 'Enter your password.', code: 'validation' };
  }
  const client = getSupabase()!;
  const { data, error } = await client.auth.signInWithPassword({
    email: trimmed,
    password,
  });
  if (error) {
    if (isEmailNotConfirmedError(error)) {
      return {
        ok: false,
        message: messageFromAuthReason('emailNotConfirmed'),
        code: 'emailNotConfirmed',
      };
    }
    return { ok: false, message: messageFromAuthError(error), code: error.code };
  }
  if (!data.session) {
    return { ok: false, message: messageFromAuthReason('authFailed') };
  }
  await afterSignIn();
  return { ok: true, session: mapSession(data.session) };
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}): Promise<SignUpResult> {
  if (!supabaseConfigured) {
    return { ok: false, message: supabaseConfigErrorMessage(), code: 'notConfigured' };
  }
  const email = input.email.trim();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Enter a valid email address.', code: 'validation' };
  }
  if (input.password.length < 8) {
    return {
      ok: false,
      message: messageFromAuthReason('passwordTooShort'),
      code: 'passwordTooShort',
    };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, message: 'Passwords do not match.', code: 'validation' };
  }
  if (!input.acceptTerms || !input.acceptPrivacy) {
    return {
      ok: false,
      message: messageFromAuthReason('termsRequired'),
      code: 'termsRequired',
    };
  }

  const client = getSupabase()!;
  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
  });
  if (error) {
    return { ok: false, message: messageFromAuthError(error), code: error.code };
  }
  if (!data.session) {
    const awaiting =
      requireEmailConfirmation ||
      (data.user != null && data.user.email_confirmed_at == null);
    if (awaiting) {
      return {
        ok: false,
        code: 'emailConfirmationRequired',
        message: messageFromAuthReason('emailConfirmationRequired'),
        email,
      };
    }
    return { ok: false, message: messageFromAuthReason('authFailed') };
  }
  await afterSignIn();
  return { ok: true, session: mapSession(data.session) };
}

export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<AuthResult> {
  if (!supabaseConfigured) {
    return { ok: false, message: supabaseConfigErrorMessage(), code: 'notConfigured' };
  }
  const trimmedEmail = email.trim();
  const trimmedToken = token.trim();
  if (!EMAIL_RE.test(trimmedEmail)) {
    return { ok: false, message: 'Enter a valid email address.', code: 'validation' };
  }
  if (!/^\d{6}$/.test(trimmedToken)) {
    return {
      ok: false,
      message: messageFromAuthReason('emailConfirmationOtpInvalid'),
      code: 'emailConfirmationOtpInvalid',
    };
  }
  const client = getSupabase()!;
  const { data, error } = await client.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: 'signup',
  });
  if (error) {
    return { ok: false, message: messageFromAuthError(error), code: error.code };
  }
  if (!data.session) {
    return {
      ok: false,
      message: messageFromAuthReason('emailConfirmationOtpInvalid'),
      code: 'emailConfirmationOtpInvalid',
    };
  }
  await afterSignIn();
  return { ok: true, session: mapSession(data.session) };
}

export async function resendEmailConfirmation(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabaseConfigured) {
    return { ok: false, message: supabaseConfigErrorMessage() };
  }
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  const client = getSupabase()!;
  const { error } = await client.auth.resend({
    type: 'signup',
    email: trimmed,
  });
  if (error) {
    return { ok: false, message: messageFromAuthError(error) };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const client = getSupabase();
  if (!client) {
    return;
  }
  await client.auth.signOut();
}

export async function restoreSession(): Promise<AuthSession | null> {
  if (!supabaseConfigured) {
    return null;
  }
  const client = getSupabase()!;
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session) {
    return null;
  }
  // Validate against the server (stale JWT after db:reset / revoke).
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    await client.auth.signOut();
    return null;
  }
  return { user: mapUser(userData.user) };
}
