import { TestBed } from '@angular/core/testing';
import { ACTIVATION_PORT } from '@oequ/ports-angular';

import {
  MockActivationAdapter,
  provideMockActivation,
} from './mock-activation.adapter';

describe('provideMockActivation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideMockActivation()],
    });
  });

  it('registers one shared instance for MockActivationAdapter and ACTIVATION_PORT', () => {
    const asClass = TestBed.inject(MockActivationAdapter);
    const asPort = TestBed.inject(ACTIVATION_PORT);
    expect(asClass).toBe(asPort);
    expect(asClass).toBe(TestBed.inject(MockActivationAdapter));
  });
});
