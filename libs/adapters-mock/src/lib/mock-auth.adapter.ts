import { Injectable, Injector, inject } from '@angular/core';
import {
  AUTH_PORT,
  type AuthClaims,
  type AuthPort,
  type AuthSession,
  type AuthSessionDevice,
  type AuthUser,
  type EmailPasswordCredentials,
  type RegisterCredentials,
  portErr,
  portOk,
  type PortResult,
} from '@oequ/ports';
import { BehaviorSubject, type Observable } from 'rxjs';

import {
  MOCK_AUTH_SESSION,
  MOCK_DEMO_EMAIL,
  MOCK_DEMO_PASSWORD,
  MOCK_SESSION_DEVICES,
} from './data/mock-data';
import { MockOrgAdapter } from './mock-org.adapter';

const DEMO_SIGNED_IN_STORAGE_KEY = 'oequ-demo-signed-in';
const DEMO_USER_DISPLAY_NAME_KEY = 'oequ-demo-user-display-name';

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
  return readSignedInFlag()
    ? sessionWithStoredProfile(MOCK_AUTH_SESSION)
    : null;
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
      return portErr({
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password.',
      });
    }

    setSignedInFlag(true);
    const session = sessionWithStoredProfile(MOCK_AUTH_SESSION);
    this.sessionSubject.next(session);
    return portOk(session);
  }

  async signUpWithPassword(
    credentials: RegisterCredentials,
  ): Promise<PortResult<AuthSession>> {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!credentials.acceptTerms || !credentials.acceptPrivacy) {
      return portErr({
        code: 'VALIDATION',
        message: 'You must accept the Terms of Service and Privacy Policy.',
      });
    }

    if (password.length < 8) {
      return portErr({
        code: 'VALIDATION',
        message: 'Password must be at least 8 characters.',
      });
    }

    if (email === MOCK_DEMO_EMAIL) {
      return portErr({
        code: 'VALIDATION',
        message: 'An account with this email already exists.',
      });
    }

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
    setSignedInFlag(false);
    this.sessionSubject.next(null);
    return portOk(undefined);
  }

  async refreshSession(): Promise<PortResult<AuthSession | null>> {
    return portOk(this.sessionSubject.value);
  }

  async updateProfile(input: {
    displayName: string;
  }): Promise<PortResult<AuthUser>> {
    const current = this.sessionSubject.value;
    if (!current) {
      return portErr({ code: 'UNAUTHENTICATED', message: 'Not signed in' });
    }

    const user: AuthUser = {
      ...current.user,
      displayName: input.displayName.trim(),
    };

    writeStoredDisplayName(user.displayName);
    this.sessionSubject.next({
      user,
      claims: current.claims,
    });

    return portOk(user);
  }

  async listActiveSessions(): Promise<
    PortResult<readonly AuthSessionDevice[]>
  > {
    if (!this.sessionSubject.value) {
      return portErr({ code: 'UNAUTHENTICATED', message: 'Not signed in' });
    }
    return portOk(this.sessions);
  }

  async revokeSession(sessionId: string): Promise<PortResult<void>> {
    const current = this.sessions.find((s) => s.current);
    if (current?.id === sessionId) {
      return portErr({
        code: 'VALIDATION',
        message: 'You cannot revoke your current session.',
      });
    }
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    return portOk(undefined);
  }

  async revokeAllOtherSessions(): Promise<PortResult<void>> {
    this.sessions = this.sessions.filter((s) => s.current);
    return portOk(undefined);
  }

  setSession(session: AuthSession | null): void {
    this.sessionSubject.next(session);
    setSignedInFlag(session !== null);
  }
}

export const MOCK_AUTH_PROVIDER = {
  provide: AUTH_PORT,
  useExisting: MockAuthAdapter,
};
