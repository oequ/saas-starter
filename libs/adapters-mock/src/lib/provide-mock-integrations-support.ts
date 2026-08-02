import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';
import { DEMO_AUTH_EXTENSION } from '@oequ/ports-angular';

import { MockAuthAdapter } from './mock-auth.adapter';
import {
  MOCK_BILLING_PROVIDER,
  MockBillingAdapter,
} from './mock-billing.adapter';
import { provideMockIntegrations } from './mock-integrations.adapter';
import { provideMockSupport } from './mock-support.adapter';

/** Billing (for WebBillingAdapter), integrations, support — `apps/web` Supabase path. */
export function provideMockIntegrationsSupport(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MockAuthAdapter,
    {
      provide: DEMO_AUTH_EXTENSION,
      useExisting: MockAuthAdapter,
    },
    MockBillingAdapter,
    ...provideMockIntegrations(),
    ...provideMockSupport(),
    MOCK_BILLING_PROVIDER,
  ]);
}
