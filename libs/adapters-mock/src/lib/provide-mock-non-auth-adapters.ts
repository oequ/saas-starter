import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';

import { provideMockActivation } from './mock-activation.adapter';
import { provideMockApiKeys } from './mock-api-keys.adapter';
import {
  MOCK_EMAILS_PROVIDER,
  MockEmailsAdapter,
} from './mock-emails.adapter';
import { provideMockIntegrations } from './mock-integrations.adapter';
import {
  MOCK_BILLING_PROVIDER,
  MockBillingAdapter,
} from './mock-billing.adapter';
import {
  MOCK_METRICS_PROVIDER,
  MockMetricsAdapter,
} from './mock-metrics.adapter';
import { provideMockSupport } from './mock-support.adapter';
import { provideMockProject } from './mock-project.adapter';

/** Billing, activation, and other ports — mock only (used by `provideDemoAdapters`). Auth via provideMockAuth(). */
export function provideMockNonAuthAdapters(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MockEmailsAdapter,
    MockBillingAdapter,
    ...provideMockActivation(),
    ...provideMockApiKeys(),
    ...provideMockIntegrations(),
    MockMetricsAdapter,
    ...provideMockSupport(),
    ...provideMockProject(),
    MOCK_BILLING_PROVIDER,
    MOCK_EMAILS_PROVIDER,
    MOCK_METRICS_PROVIDER,
  ]);
}
