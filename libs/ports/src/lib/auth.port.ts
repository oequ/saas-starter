import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  AuthClaims,
  AuthSession,
  AuthSessionDevice,
  AuthUser,
  EmailPasswordCredentials,
  RegisterCredentials,
} from './models/auth.model';
import type { PortError, PortResult } from './models/common.model';

/**
 * Authentication boundary. UI and guards depend on this port only — never on Supabase SDK.
 *
 * Implementations: `adapters-mock`, `data-access-supabase` (full-stack).
 */
export interface AuthPort {
  /** Current session stream; `null` when signed out. */
  readonly session$: Observable<AuthSession | null>;

  /**
   * Fast, locally verifiable claims for routing and org context (full-stack: `getClaims()`).
   */
  getClaims(): Promise<PortResult<AuthClaims | null>>;

  /**
   * Authoritative user check before destructive actions (full-stack: `getUser()`).
   */
  getVerifiedUser(): Promise<PortResult<AuthUser | null>>;

  signInWithPassword(
    credentials: EmailPasswordCredentials,
  ): Promise<PortResult<AuthSession>>;

  signUpWithPassword(
    credentials: RegisterCredentials,
  ): Promise<PortResult<AuthSession>>;

  /** Confirm signup with 6-digit code from email (when email confirmation is enabled). */
  verifyEmailConfirmationOtp(
    email: string,
    token: string,
  ): Promise<PortResult<AuthSession>>;

  /** Resend signup confirmation email. */
  resendEmailConfirmation(email: string): Promise<PortResult<void>>;

  /**
   * After user opens the confirmation link: exchange URL tokens for a session.
   * Returns session when confirmed; `null` when no confirmation tokens are present.
   */
  completeEmailConfirmationFromRedirect(): Promise<PortResult<AuthSession | null>>;

  signOut(): Promise<PortResult<void>>;

  /** Send password reset email (Supabase `resetPasswordForEmail`). */
  requestPasswordReset(email: string): Promise<PortResult<void>>;

  /** Set new password after recovery link; adapter may sign out on success. */
  updatePassword(newPassword: string): Promise<PortResult<void>>;

  /** Change password while signed in (verifies current password first). */
  changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<PortResult<void>>;

  /** Whether the user opened a valid password-recovery link in this browser. */
  isPasswordRecoveryActive(): Promise<PortResult<boolean>>;

  /** Re-fetch session/claims after org switch or token refresh. */
  refreshSession(): Promise<PortResult<AuthSession | null>>;

  /** Update profile fields for the signed-in user (demo / full-stack adapter). */
  updateProfile(input: {
    displayName: string;
  }): Promise<PortResult<AuthUser>>;

  listActiveSessions(): Promise<PortResult<readonly AuthSessionDevice[]>>;

  revokeSession(sessionId: string): Promise<PortResult<void>>;

  revokeAllOtherSessions(): Promise<PortResult<void>>;
}

export const AUTH_PORT = new InjectionToken<AuthPort>('AUTH_PORT');

/** UI/auth behavior flags (e.g. from `SupabaseConfig` in full-stack apps). */
export interface AuthFeatures {
  readonly requireEmailConfirmation?: boolean;
}

export const AUTH_FEATURES = new InjectionToken<AuthFeatures>('AUTH_FEATURES');

export function isEmailConfirmationRequiredError(error: PortError): boolean {
  return (
    error.code === 'VALIDATION' && error.reason === 'emailConfirmationRequired'
  );
}
