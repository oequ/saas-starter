import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';

import { provideMockAuth } from './mock-auth.adapter';
import {
  MOCK_BILLING_PROVIDER,
  MockBillingAdapter,
} from './mock-billing.adapter';
import { provideMockIntegrations } from './mock-integrations.adapter';
import { provideMockSupport } from './mock-support.adapter';

/** Billing (for WebBillingAdapter), integrations, support — `apps/web` Supabase path. */
export function provideMockIntegrationsSupport(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideMockAuth({ bindAuthPort: false }),
    MockBillingAdapter,
    ...provideMockIntegrations(),
    ...provideMockSupport(),
    MOCK_BILLING_PROVIDER,
  ]);
}
