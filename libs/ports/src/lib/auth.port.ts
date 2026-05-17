import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  AuthClaims,
  AuthSession,
  AuthUser,
  EmailPasswordCredentials,
} from './models/auth.model';
import type { PortResult } from './models/common.model';

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

  signOut(): Promise<PortResult<void>>;

  /** Re-fetch session/claims after org switch or token refresh. */
  refreshSession(): Promise<PortResult<AuthSession | null>>;

  /** Update profile fields for the signed-in user (demo / full-stack adapter). */
  updateProfile(input: {
    displayName: string;
  }): Promise<PortResult<AuthUser>>;
}

export const AUTH_PORT = new InjectionToken<AuthPort>('AUTH_PORT');
