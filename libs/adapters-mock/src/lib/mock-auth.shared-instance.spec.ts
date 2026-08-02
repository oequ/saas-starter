import { TestBed } from '@angular/core/testing';
import { AUTH_PORT } from '@oequ/ports-angular';

import { MockAuthAdapter, provideMockAuth } from './mock-auth.adapter';

describe('provideMockAuth', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideMockAuth()],
    });
  });

  it('registers one shared instance for MockAuthAdapter and AUTH_PORT', () => {
    const asClass = TestBed.inject(MockAuthAdapter);
    const asPort = TestBed.inject(AUTH_PORT);
    expect(asClass).toBe(asPort);
    expect(asClass).toBe(TestBed.inject(MockAuthAdapter));
  });

  it('can omit AUTH_PORT binding for web impersonation MockAuth', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...provideMockAuth({ bindAuthPort: false })],
    });

    expect(TestBed.inject(MockAuthAdapter)).toBeTruthy();
    expect(() => TestBed.inject(AUTH_PORT)).toThrow();
  });
});
