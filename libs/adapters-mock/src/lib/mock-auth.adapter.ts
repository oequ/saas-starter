import { Injectable } from '@angular/core';
import {
  AUTH_PORT,
  type AuthClaims,
  type AuthPort,
  type AuthSession,
  type AuthUser,
  type EmailPasswordCredentials,
  portErr,
  portOk,
  type PortResult,
} from '@oequ/ports';
import { BehaviorSubject, type Observable } from 'rxjs';

import { MOCK_AUTH_SESSION } from './data/mock-data';

@Injectable()
export class MockAuthAdapter implements AuthPort {
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(
    MOCK_AUTH_SESSION,
  );

  readonly session$: Observable<AuthSession | null> =
    this.sessionSubject.asObservable();

  async getClaims(): Promise<PortResult<AuthClaims | null>> {
    return portOk(this.sessionSubject.value?.claims ?? null);
  }

  async getVerifiedUser(): Promise<PortResult<AuthUser | null>> {
    return portOk(this.sessionSubject.value?.user ?? null);
  }

  async signInWithPassword(
    credentials: EmailPasswordCredentials,
  ): Promise<PortResult<AuthSession>> {
    void credentials;
    this.sessionSubject.next(MOCK_AUTH_SESSION);
    return portOk(MOCK_AUTH_SESSION);
  }

  async signOut(): Promise<PortResult<void>> {
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

  setSession(session: AuthSession | null): void {
    this.sessionSubject.next(session);
  }
}

export const MOCK_AUTH_PROVIDER = {
  provide: AUTH_PORT,
  useClass: MockAuthAdapter,
};
