import { Injectable } from '@angular/core';
import {
  AUTH_PORT,
  type AuthClaims,
  type AuthPort,
  type AuthSession,
  type AuthSessionDevice,
  type AuthUser,
  type EmailPasswordCredentials,
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

const DEMO_SIGNED_OUT_STORAGE_KEY = 'oequ-demo-signed-out';

function readSignedOutFlag(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(DEMO_SIGNED_OUT_STORAGE_KEY) === '1';
}

function setSignedOutFlag(signedOut: boolean): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  if (signedOut) {
    sessionStorage.setItem(DEMO_SIGNED_OUT_STORAGE_KEY, '1');
  } else {
    sessionStorage.removeItem(DEMO_SIGNED_OUT_STORAGE_KEY);
  }
}

function initialSession(): AuthSession | null {
  return readSignedOutFlag() ? null : MOCK_AUTH_SESSION;
}

@Injectable()
export class MockAuthAdapter implements AuthPort {
  private sessions = [...MOCK_SESSION_DEVICES];

  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(
    initialSession(),
  );

  readonly session$: Observable<AuthSession | null> =
    this.sessionSubject.asObservable();

  resetMockState(): void {
    setSignedOutFlag(false);
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

    setSignedOutFlag(false);
    this.sessionSubject.next(MOCK_AUTH_SESSION);
    return portOk(MOCK_AUTH_SESSION);
  }

  async signOut(): Promise<PortResult<void>> {
    setSignedOutFlag(true);
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
    setSignedOutFlag(session === null);
  }
}

export const MOCK_AUTH_PROVIDER = {
  provide: AUTH_PORT,
  useClass: MockAuthAdapter,
};
