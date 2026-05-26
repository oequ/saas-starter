import { Injectable, Injector, inject } from '@angular/core';
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
  portOk,
  type PortResult,
} from '@oequ/ports';

import { mockErr } from './mock-port-error';
import { BehaviorSubject, type Observable } from 'rxjs';

import type { DemoWorkspaceMemberImpersonationInput } from '@oequ/ports';
import {
  MOCK_AUTH_SESSION,
  MOCK_DEMO_EMAIL,
  MOCK_DEMO_PASSWORD,
  MOCK_SESSION_DEVICES,
} from './data/mock-data';
import { MockOrgAdapter } from './mock-org.adapter';

const DEMO_SIGNED_IN_STORAGE_KEY = 'oequ-demo-signed-in';
const MOCK_PASSWORD_RECOVERY_KEY = 'oequ-mock-password-recovery';
const DEMO_USER_DISPLAY_NAME_KEY = 'oequ-demo-user-display-name';
const DEMO_IMPERSONATION_SESSION_KEY = 'oequ-demo-impersonation-session';

function readStoredDisplayName(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(DEMO_USER_DISPLAY_NAME_KEY);
}

function writeStoredDisplayName(displayName: string | null): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  if (!displayName) {
    sessionStorage.removeItem(DEMO_USER_DISPLAY_NAME_KEY);
    return;
  }
  sessionStorage.setItem(DEMO_USER_DISPLAY_NAME_KEY, displayName);
}

function sessionWithStoredProfile(base: AuthSession): AuthSession {
  const storedName = readStoredDisplayName();
  if (!storedName) {
    return base;
  }
  return {
    ...base,
    user: { ...base.user, displayName: storedName },
  };
}

function readImpersonationSession(): AuthSession | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(DEMO_IMPERSONATION_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function setMockPasswordRecoveryFlag(email: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(MOCK_PASSWORD_RECOVERY_KEY, email);
}

function readMockPasswordRecoveryFlag(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(MOCK_PASSWORD_RECOVERY_KEY);
}

function clearMockPasswordRecoveryFlag(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(MOCK_PASSWORD_RECOVERY_KEY);
}

function writeImpersonationSession(session: AuthSession): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(DEMO_IMPERSONATION_SESSION_KEY, JSON.stringify(session));
}

function clearImpersonationSession(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(DEMO_IMPERSONATION_SESSION_KEY);
}

function readSignedInFlag(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(DEMO_SIGNED_IN_STORAGE_KEY) === '1';
}

function setSignedInFlag(signedIn: boolean): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  if (signedIn) {
    sessionStorage.setItem(DEMO_SIGNED_IN_STORAGE_KEY, '1');
  } else {
    sessionStorage.removeItem(DEMO_SIGNED_IN_STORAGE_KEY);
  }
}

function initialSession(): AuthSession | null {
  if (!readSignedInFlag()) {
    return null;
  }
  const impersonated = readImpersonationSession();
  const base = impersonated ?? MOCK_AUTH_SESSION;
  return sessionWithStoredProfile(base);
}

/** Preserve impersonated org role when mock org adapter re-selects the same workspace. */
export function orgClaimForOrganization(
  claims: AuthClaims,
  organizationId: string,
): OrgContextClaim {
  if (claims.org?.organizationId === organizationId) {
    return claims.org;
  }
  return { organizationId, role: 'owner' };
}

@Injectable()
export class MockAuthAdapter implements AuthPort {
  private readonly injector = inject(Injector);
  private sessions = [...MOCK_SESSION_DEVICES];

  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(
    initialSession(),
  );

  readonly session$: Observable<AuthSession | null> =
    this.sessionSubject.asObservable();

  resetMockState(): void {
    clearImpersonationSession();
    setSignedInFlag(true);
    writeStoredDisplayName(null);
    this.sessions = [...MOCK_SESSION_DEVICES];
    this.sessionSubject.next(MOCK_AUTH_SESSION);
  }

  async getClaims(): Promise<PortResult<AuthClaims | null>> {
    return portOk(this.sessionSubject.value?.claims ?? null);
  }

  async getVerifiedUser(): Promise<PortResult<AuthUser | null>> {
    return portOk(this.sessionSubject.value?.user ?? null);
  }

  async signInWithPassword(
    credentials: EmailPasswordCredentials,
  ): Promise<PortResult<AuthSession>> {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (email !== MOCK_DEMO_EMAIL || password !== MOCK_DEMO_PASSWORD) {
      return mockErr('UNAUTHENTICATED', 'invalidCredentials');
    }

    clearImpersonationSession();
    setSignedInFlag(true);
    const session = sessionWithStoredProfile(MOCK_AUTH_SESSION);
    this.sessionSubject.next(session);
    return portOk(session);
  }

  /** Demo-only — use via `DEMO_AUTH_EXTENSION`, not production `AuthPort`. */
  async impersonateWorkspaceMember(
    input: DemoWorkspaceMemberImpersonationInput,
  ): Promise<PortResult<AuthSession>> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName?.trim() || null;

    const session: AuthSession = {
      user: {
        id: input.userId,
        email,
        displayName,
      },
      claims: {
        sub: input.userId,
        email,
        org: {
          organizationId: input.organizationId,
          role: input.role,
        },
      },
    };

    setSignedInFlag(true);
    writeStoredDisplayName(displayName);
    writeImpersonationSession(session);
    this.sessionSubject.next(session);
    return portOk(session);
  }

  async signUpWithPassword(
    credentials: RegisterCredentials,
  ): Promise<PortResult<AuthSession>> {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!credentials.acceptTerms || !credentials.acceptPrivacy) {
      return mockErr('VALIDATION', 'termsRequired');
    }

    if (password.length < 8) {
      return mockErr('VALIDATION', 'passwordTooShort');
    }

    if (email === MOCK_DEMO_EMAIL) {
      return mockErr('VALIDATION', 'emailExists');
    }

    clearImpersonationSession();

    const userId = crypto.randomUUID();
    const session: AuthSession = {
      user: {
        id: userId,
        email,
        displayName: null,
      },
      claims: {
        sub: userId,
        email,
        org: null,
      },
    };

    setSignedInFlag(true);
    this.sessions = [...MOCK_SESSION_DEVICES];
    this.sessionSubject.next(session);
    this.injector.get(MockOrgAdapter).setZeroOrganizations();

    return portOk(session);
  }

  async signOut(): Promise<PortResult<void>> {
    clearImpersonationSession();
    setSignedInFlag(false);
    writeStoredDisplayName(null);
    clearMockPasswordRecoveryFlag();
    this.sessionSubject.next(null);
    return portOk(undefined);
  }

  async requestPasswordReset(email: string): Promise<PortResult<void>> {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(trimmed)) {
      return mockErr('VALIDATION', 'invalidInviteEmail');
    }
    setMockPasswordRecoveryFlag(trimmed);
    return portOk(undefined);
  }

  async updatePassword(newPassword: string): Promise<PortResult<void>> {
    if (newPassword.length < 8) {
      return mockErr('VALIDATION', 'passwordTooShort');
    }
    if (!readMockPasswordRecoveryFlag()) {
      return mockErr('UNAVAILABLE', 'passwordRecoveryInactive');
    }
    clearMockPasswordRecoveryFlag();
    await this.signOut();
    return portOk(undefined);
  }

  async isPasswordRecoveryActive(): Promise<PortResult<boolean>> {
    return portOk(readMockPasswordRecoveryFlag() !== null);
  }

  async refreshSession(): Promise<PortResult<AuthSession | null>> {
    return portOk(this.sessionSubject.value);
  }

  async updateProfile(input: {
    displayName: string;
  }): Promise<PortResult<AuthUser>> {
    const current = this.sessionSubject.value;
    if (!current) {
      return mockErr('UNAUTHENTICATED', 'notSignedIn');
    }

    const user: AuthUser = {
      ...current.user,
      displayName: input.displayName.trim(),
    };

    const next: AuthSession = { user, claims: current.claims };
    writeStoredDisplayName(user.displayName);
    this.applySession(next);
    return portOk(user);
  }

  async listActiveSessions(): Promise<
    PortResult<readonly AuthSessionDevice[]>
  > {
    if (!this.sessionSubject.value) {
      return mockErr('UNAUTHENTICATED', 'notSignedIn');
    }
    return portOk(this.sessions);
  }

  async revokeSession(sessionId: string): Promise<PortResult<void>> {
    const current = this.sessions.find((s) => s.current);
    if (current?.id === sessionId) {
      return mockErr('VALIDATION', 'cannotRevokeCurrentSession');
    }
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    return portOk(undefined);
  }

  async revokeAllOtherSessions(): Promise<PortResult<void>> {
    this.sessions = this.sessions.filter((s) => s.current);
    return portOk(undefined);
  }

  setSession(session: AuthSession | null): void {
    if (!session) {
      clearImpersonationSession();
      this.sessionSubject.next(null);
      setSignedInFlag(false);
      return;
    }
    this.applySession(session);
  }

  private applySession(session: AuthSession): void {
    const isDemoOwner =
      session.user.id === MOCK_AUTH_SESSION.user.id &&
      session.user.email === MOCK_DEMO_EMAIL;

    if (isDemoOwner) {
      clearImpersonationSession();
    } else {
      writeImpersonationSession(session);
    }

    setSignedInFlag(true);
    this.sessionSubject.next(session);
  }
}

export const MOCK_AUTH_PROVIDER = {
  provide: AUTH_PORT,
  useExisting: MockAuthAdapter,
};
