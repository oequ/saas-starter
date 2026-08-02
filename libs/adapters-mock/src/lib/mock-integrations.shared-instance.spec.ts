import { TestBed } from '@angular/core/testing';
import { INTEGRATIONS_PORT } from '@oequ/ports-angular';

import {
  MockIntegrationsAdapter,
  provideMockIntegrations,
} from './mock-integrations.adapter';

describe('provideMockIntegrations', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideMockIntegrations()],
    });
  });

  it('registers one shared instance for MockIntegrationsAdapter and INTEGRATIONS_PORT', () => {
    const asClass = TestBed.inject(MockIntegrationsAdapter);
    const asPort = TestBed.inject(INTEGRATIONS_PORT);
    expect(asClass).toBe(asPort);
    expect(asClass).toBe(TestBed.inject(MockIntegrationsAdapter));
  });
});
