import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';
import { DEMO_AUTH_EXTENSION } from '@oequ/ports';

import { MockAuthAdapter } from './mock-auth.adapter';
import {
  MOCK_BILLING_PROVIDER,
  MockBillingAdapter,
} from './mock-billing.adapter';
import {
  MOCK_INTEGRATIONS_PROVIDER,
  MockIntegrationsAdapter,
} from './mock-integrations.adapter';
import {
  MOCK_SUPPORT_PROVIDER,
  MockSupportAdapter,
} from './mock-support.adapter';

/** Billing (for WebBillingAdapter), integrations, support — `apps/web` Supabase path. */
export function provideMockIntegrationsSupport(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MockAuthAdapter,
    {
      provide: DEMO_AUTH_EXTENSION,
      useExisting: MockAuthAdapter,
    },
    MockBillingAdapter,
    MockIntegrationsAdapter,
    MockSupportAdapter,
    MOCK_BILLING_PROVIDER,
    MOCK_INTEGRATIONS_PROVIDER,
    MOCK_SUPPORT_PROVIDER,
  ]);
}
