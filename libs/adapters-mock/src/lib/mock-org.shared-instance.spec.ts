import { TestBed } from '@angular/core/testing';
import { ORG_PORT } from '@oequ/ports-angular';

import { MockActivationAdapter } from './mock-activation.adapter';
import { MockApiKeysAdapter } from './mock-api-keys.adapter';
import { provideMockAuth } from './mock-auth.adapter';
import { MockBillingAdapter } from './mock-billing.adapter';
import { MockOrgAdapter, provideMockOrg } from './mock-org.adapter';

describe('provideMockOrg', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideMockAuth(),
        MockBillingAdapter,
        MockActivationAdapter,
        MockApiKeysAdapter,
        ...provideMockOrg(),
      ],
    });
  });

  it('registers one shared instance for MockOrgAdapter and ORG_PORT', () => {
    const asClass = TestBed.inject(MockOrgAdapter);
    const asPort = TestBed.inject(ORG_PORT);
    expect(asClass).toBe(asPort);
    expect(asClass).toBe(TestBed.inject(MockOrgAdapter));
  });
});
