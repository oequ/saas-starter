import { TestBed } from '@angular/core/testing';
import { SUPPORT_PORT } from '@oequ/ports-angular';

import {
  MockSupportAdapter,
  provideMockSupport,
} from './mock-support.adapter';

describe('provideMockSupport', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideMockSupport()],
    });
  });

  it('registers one shared instance for MockSupportAdapter and SUPPORT_PORT', () => {
    const asClass = TestBed.inject(MockSupportAdapter);
    const asPort = TestBed.inject(SUPPORT_PORT);
    expect(asClass).toBe(asPort);
    expect(asClass).toBe(TestBed.inject(MockSupportAdapter));
  });
});
