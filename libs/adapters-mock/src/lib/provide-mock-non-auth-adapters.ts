import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';

import {
  MOCK_ACTIVATION_PROVIDER,
  MockActivationAdapter,
} from './mock-activation.adapter';
import {
  MOCK_API_KEYS_PROVIDER,
  MockApiKeysAdapter,
} from './mock-api-keys.adapter';
import {
  MOCK_EMAILS_PROVIDER,
  MockEmailsAdapter,
} from './mock-emails.adapter';
import {
  MOCK_INTEGRATIONS_PROVIDER,
  MockIntegrationsAdapter,
} from './mock-integrations.adapter';
import {
  MOCK_BILLING_PROVIDER,
  MockBillingAdapter,
} from './mock-billing.adapter';
import {
  MOCK_METRICS_PROVIDER,
  MockMetricsAdapter,
} from './mock-metrics.adapter';
import {
  MOCK_SUPPORT_PROVIDER,
  MockSupportAdapter,
} from './mock-support.adapter';

/** Billing, activation, and other ports — mock only (used by `apps/web`). */
export function provideMockNonAuthAdapters(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MockBillingAdapter,
    MockActivationAdapter,
    MockApiKeysAdapter,
    MockEmailsAdapter,
    MockIntegrationsAdapter,
    MockMetricsAdapter,
    MockSupportAdapter,
    MOCK_BILLING_PROVIDER,
    MOCK_ACTIVATION_PROVIDER,
    MOCK_API_KEYS_PROVIDER,
    MOCK_EMAILS_PROVIDER,
    MOCK_INTEGRATIONS_PROVIDER,
    MOCK_METRICS_PROVIDER,
    MOCK_SUPPORT_PROVIDER,
  ]);
}
