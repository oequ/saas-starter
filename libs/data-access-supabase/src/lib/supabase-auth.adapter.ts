import { Injectable, inject } from '@angular/core';
import {
  AUTH_PORT,
  type AuthClaims,
  type AuthPort,
  type AuthSession,
  type AuthSessionDevice,
  type AuthUser,
  type EmailPasswordCredentials,
  type OrgContextClaim,
  type RegisterCredentials,
  portErr,
  portOk,
  type PortResult,
} from '@oequ/ports';
import type { Session } from '@supabase/supabase-js';
import { BehaviorSubject, type Observable } from 'rxjs';

import { SupabaseClientService } from './supabase-client.service';
import {
  mapSession,
  mapUser,
  orgClaimFromJwt,
} from './supabase-session.mapper';
import { supabaseErr, supabaseErrFromAuth } from './supabase-port-error';

@Injectable()
export class SupabaseAuthAdapter implements AuthPort {
  private readonly supabase = inject(SupabaseClientService);
  private orgOverride: OrgContextClaim | null | undefined;

  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(
    null,
  );

  readonly session$: Observable<AuthSession | null> =
    this.sessionSubject.asObservable();

  constructor() {
    const client = this.supabase.getClient();
    if (!client) {
      return;
    }

    void client.auth.getSession().then(({ data }) => {
      this.applySupabaseSession(data.session);
    });

    client.auth.onAuthStateChange((_event, session) => {
      this.applySupabaseSession(session);
    });
  }

  /** Persists active workspace for JWT hook (`custom_access_token_hook`). */
  async persistActiveOrgSlug(slug: string | null): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { error } = await client.auth.updateUser({
      data: { active_org_slug: slug ?? '' },
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    const refreshed = await this.refreshSession();
    if (refreshed.ok === false) {
      return portErr<void>(refreshed.error);
    }
    return portOk(undefined);
  }

  /** Used by `SupabaseOrgAdapter` to sync workspace context until JWT hook lands. */
  setSessionClaims(org: OrgContextClaim | null): void {
    const current = this.sessionSubject.value;
    if (!current) {
      return;
    }
    this.orgOverride = org;
    this.sessionSubject.next({
      user: current.user,
      claims: { ...current.claims, org },
    });
  }

  private applySupabaseSession(session: Session | null): void {
    if (!session?.user) {
      this.orgOverride = undefined;
      this.sessionSubject.next(null);
      return;
    }
    const override =
      this.orgOverride !== undefined ? this.orgOverride : undefined;
    const mapped = mapSession(
      session,
      override !== undefined ? override : orgClaimFromJwt(session.user),
    );
    this.sessionSubject.next(mapped);
  }

  async getClaims(): Promise<PortResult<AuthClaims | null>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { data, error } = await client.auth.getClaims();
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data?.claims) {
      return portOk(null);
    }
    const claims = data.claims as Record<string, unknown>;
    const sub = typeof claims['sub'] === 'string' ? claims['sub'] : null;
    if (!sub) {
      return portOk(this.sessionSubject.value?.claims ?? null);
    }
    const email =
      typeof claims['email'] === 'string'
        ? claims['email']
        : this.sessionSubject.value?.claims.email;
    const org =
      this.orgOverride !== undefined
        ? this.orgOverride
        : (this.sessionSubject.value?.claims.org ?? null);
    return portOk({ sub, email, org });
  }

  async getVerifiedUser(): Promise<PortResult<AuthUser | null>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { data, error } = await client.auth.getUser();
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.user) {
      return portOk(null);
    }
    return portOk(mapUser(data.user));
  }

  async signInWithPassword(
    credentials: EmailPasswordCredentials,
  ): Promise<PortResult<AuthSession>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { data, error } = await client.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password,
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.session) {
      return supabaseErr('UNKNOWN', 'authFailed');
    }
    this.orgOverride = undefined;
    const session = mapSession(data.session);
    this.sessionSubject.next(session);
    return portOk(session);
  }

  async signUpWithPassword(
    credentials: RegisterCredentials,
  ): Promise<PortResult<AuthSession>> {
    if (!credentials.acceptTerms || !credentials.acceptPrivacy) {
      return supabaseErr('VALIDATION', 'termsRequired');
    }
    if (credentials.password.length < 8) {
      return supabaseErr('VALIDATION', 'passwordTooShort');
    }
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { data, error } = await client.auth.signUp({
      email: credentials.email.trim(),
      password: credentials.password,
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.session) {
      return supabaseErr('VALIDATION', 'emailConfirmationRequired');
    }
    this.orgOverride = null;
    const session = mapSession(data.session, null);
    this.sessionSubject.next(session);
    return portOk(session);
  }

  async signOut(): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { error } = await client.auth.signOut();
    if (error) {
      return supabaseErrFromAuth(error);
    }
    this.orgOverride = undefined;
    this.sessionSubject.next(null);
    return portOk(undefined);
  }

  async refreshSession(): Promise<PortResult<AuthSession | null>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { data, error } = await client.auth.refreshSession();
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.session) {
      this.sessionSubject.next(null);
      return portOk(null);
    }
    const session = mapSession(
      data.session,
      this.orgOverride !== undefined ? this.orgOverride : undefined,
    );
    this.sessionSubject.next(session);
    return portOk(session);
  }

  async updateProfile(input: {
    displayName: string;
  }): Promise<PortResult<AuthUser>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const displayName = input.displayName.trim();
    const { data, error } = await client.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.user) {
      return supabaseErr('UNKNOWN', 'authFailed');
    }
    const user = mapUser(data.user);
    const current = this.sessionSubject.value;
    if (current) {
      this.sessionSubject.next({ user, claims: current.claims });
    }
    return portOk(user);
  }

  async listActiveSessions(): Promise<
    PortResult<readonly AuthSessionDevice[]>
  > {
    const current = this.sessionSubject.value;
    if (!current) {
      return supabaseErr('UNAUTHENTICATED', 'notSignedIn');
    }
    return portOk([
      {
        id: 'current',
        deviceLabel: 'This browser',
        browser: 'Web',
        location: 'Local',
        lastActiveAt: new Date().toISOString(),
        current: true,
      },
    ]);
  }

  async revokeSession(_sessionId: string): Promise<PortResult<void>> {
    return supabaseErr('UNAVAILABLE', 'sessionRevokeNotSupported');
  }

  async revokeAllOtherSessions(): Promise<PortResult<void>> {
    return supabaseErr('UNAVAILABLE', 'sessionRevokeNotSupported');
  }
}

export const SUPABASE_AUTH_PROVIDER = {
  provide: AUTH_PORT,
  useExisting: SupabaseAuthAdapter,
};
