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

import { SUPABASE_CONFIG } from './supabase-config';
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
  private readonly config = inject(SUPABASE_CONFIG, { optional: true });
  private orgOverride: OrgContextClaim | null | undefined;
  private passwordRecoveryActive = false;

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

    void client.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: userData, error: userError } =
          await client.auth.getUser();
        if (userError || !userData.user) {
          await client.auth.signOut();
          this.orgOverride = undefined;
          this.sessionSubject.next(null);
          return;
        }
      }
      this.applySupabaseSession(data.session);
    });

    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.passwordRecoveryActive = true;
      }
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
    const prev = current.claims.org;
    if (
      prev?.organizationId === org?.organizationId &&
      prev?.role === org?.role
    ) {
      return;
    }
    this.orgOverride = org;
    this.sessionSubject.next({
      user: current.user,
      claims: { ...current.claims, org },
    });
  }

  private requireEmailConfirmation(): boolean {
    return this.config?.requireEmailConfirmation === true;
  }

  private signUpRedirectOptions(): { emailRedirectTo: string } | undefined {
    if (typeof globalThis.location === 'undefined') {
      return undefined;
    }
    return {
      emailRedirectTo: `${globalThis.location.origin}/auth/confirm-email`,
    };
  }

  private async establishSessionFromSupabase(
    session: Session,
  ): Promise<PortResult<AuthSession>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    this.orgOverride = null;
    await client.rpc('claim_my_invitations');
    const mapped = mapSession(session, null);
    this.sessionSubject.next(mapped);
    return portOk(mapped);
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
    await client.rpc('claim_my_invitations');
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
    const email = credentials.email.trim();
    const requireConfirm = this.requireEmailConfirmation();
    const { data, error } = await client.auth.signUp({
      email,
      password: credentials.password,
      options: requireConfirm ? this.signUpRedirectOptions() : undefined,
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.session) {
      if (requireConfirm) {
        return supabaseErr('VALIDATION', 'emailConfirmationRequired');
      }
      return supabaseErr('UNKNOWN', 'authFailed');
    }
    return this.establishSessionFromSupabase(data.session);
  }

  async verifyEmailConfirmationOtp(
    email: string,
    token: string,
  ): Promise<PortResult<AuthSession>> {
    const trimmedEmail = email.trim();
    const trimmedToken = token.trim();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(trimmedEmail)) {
      return supabaseErr('VALIDATION', 'invalidInviteEmail');
    }
    if (!/^\d{6}$/.test(trimmedToken)) {
      return supabaseErr('VALIDATION', 'emailConfirmationOtpInvalid');
    }
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { data, error } = await client.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'signup',
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.session) {
      return supabaseErr('VALIDATION', 'emailConfirmationOtpInvalid');
    }
    return this.establishSessionFromSupabase(data.session);
  }

  async resendEmailConfirmation(email: string): Promise<PortResult<void>> {
    const trimmed = email.trim();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(trimmed)) {
      return supabaseErr('VALIDATION', 'invalidInviteEmail');
    }
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { error } = await client.auth.resend({
      type: 'signup',
      email: trimmed,
      options: this.signUpRedirectOptions(),
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    return portOk(undefined);
  }

  async completeEmailConfirmationFromRedirect(): Promise<
    PortResult<AuthSession | null>
  > {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    if (typeof globalThis.location !== 'undefined') {
      const hash = globalThis.location.hash;
      const search = globalThis.location.search;
      const hasConfirmationTokens =
        hash.includes('access_token') ||
        hash.includes('type=signup') ||
        hash.includes('type=email') ||
        search.includes('code=');
      if (!hasConfirmationTokens) {
        return portOk(null);
      }
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      return supabaseErrFromAuth(error);
    }
    if (!data.session) {
      return portOk(null);
    }

    if (typeof globalThis.location !== 'undefined' && globalThis.location.hash) {
      globalThis.history.replaceState(
        null,
        '',
        globalThis.location.pathname + globalThis.location.search,
      );
    }

    return this.establishSessionFromSupabase(data.session);
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
    this.passwordRecoveryActive = false;
    this.sessionSubject.next(null);
    return portOk(undefined);
  }

  async requestPasswordReset(email: string): Promise<PortResult<void>> {
    const trimmed = email.trim();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(trimmed)) {
      return supabaseErr('VALIDATION', 'invalidInviteEmail');
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    if (typeof globalThis.location === 'undefined') {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const redirectTo = `${globalThis.location.origin}/auth/reset-password`;
    const { error } = await client.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }
    return portOk(undefined);
  }

  async updatePassword(newPassword: string): Promise<PortResult<void>> {
    if (newPassword.length < 8) {
      return supabaseErr('VALIDATION', 'passwordTooShort');
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) {
      return supabaseErrFromAuth(error);
    }

    this.passwordRecoveryActive = false;
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      return supabaseErrFromAuth(signOutError);
    }
    this.orgOverride = undefined;
    this.sessionSubject.next(null);
    return portOk(undefined);
  }

  async changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<PortResult<void>> {
    const currentPassword = input.currentPassword;
    const newPassword = input.newPassword;

    if (newPassword.length < 8) {
      return supabaseErr('VALIDATION', 'passwordTooShort');
    }
    if (newPassword === currentPassword) {
      return supabaseErr('VALIDATION', 'passwordUnchanged');
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const userResult = await this.getVerifiedUser();
    if (userResult.ok === false) {
      return { ok: false, error: userResult.error };
    }
    if (!userResult.data?.email) {
      return supabaseErr('UNAUTHENTICATED', 'notSignedIn');
    }

    const orgBefore =
      this.orgOverride !== undefined
        ? this.orgOverride
        : (this.sessionSubject.value?.claims.org ?? null);

    const reauth = await this.signInWithPassword({
      email: userResult.data.email,
      password: currentPassword,
    });
    if (reauth.ok === false) {
      return { ok: false, error: reauth.error };
    }

    if (orgBefore) {
      this.orgOverride = orgBefore;
      const current = this.sessionSubject.value;
      if (current) {
        this.sessionSubject.next({
          user: current.user,
          claims: { ...current.claims, org: orgBefore },
        });
      }
    }

    const { error } = await client.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return supabaseErrFromAuth(error);
    }

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();
    if (sessionError) {
      return supabaseErrFromAuth(sessionError);
    }
    this.applySupabaseSession(sessionData.session);
    if (orgBefore) {
      this.orgOverride = orgBefore;
      const current = this.sessionSubject.value;
      if (current) {
        this.sessionSubject.next({
          user: current.user,
          claims: { ...current.claims, org: orgBefore },
        });
      }
    }

    return portOk(undefined);
  }

  async isPasswordRecoveryActive(): Promise<PortResult<boolean>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    if (this.passwordRecoveryActive) {
      return portOk(true);
    }

    if (typeof globalThis.location !== 'undefined') {
      const hash = globalThis.location.hash;
      if (hash.includes('type=recovery')) {
        const { data, error } = await client.auth.getSession();
        if (error) {
          return supabaseErrFromAuth(error);
        }
        if (data.session) {
          this.passwordRecoveryActive = true;
          this.applySupabaseSession(data.session);
          return portOk(true);
        }
      }
    }

    return portOk(false);
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
