import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';

import {
  MOCK_AUTH_PROVIDER,
  MockAuthAdapter,
} from './mock-auth.adapter';
import {
  MOCK_BILLING_PROVIDER,
} from './mock-billing.adapter';
import {
  MOCK_ORG_PROVIDER,
  MockOrgAdapter,
} from './mock-org.adapter';

export function provideDemoAdapters(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MockAuthAdapter,
    MockOrgAdapter,
    MOCK_AUTH_PROVIDER,
    MOCK_ORG_PROVIDER,
    MOCK_BILLING_PROVIDER,
  ]);
}
