import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';
import { DEMO_AUTH_EXTENSION } from '@oequ/ports';

import {
  MOCK_ACTIVATION_PROVIDER,
  MockActivationAdapter,
} from './mock-activation.adapter';
import { MockAuthAdapter } from './mock-auth.adapter';
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
import {
  MOCK_PROJECT_PROVIDER,
  MockProjectAdapter,
} from './mock-project.adapter';

/** Billing, activation, and other ports — mock only (used by `apps/web`). */
export function provideMockNonAuthAdapters(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MockAuthAdapter,
    {
      provide: DEMO_AUTH_EXTENSION,
      useExisting: MockAuthAdapter,
    },
    MockBillingAdapter,
    MockActivationAdapter,
    MockApiKeysAdapter,
    MockEmailsAdapter,
    MockIntegrationsAdapter,
    MockMetricsAdapter,
    MockSupportAdapter,
    MockProjectAdapter,
    MOCK_BILLING_PROVIDER,
    MOCK_ACTIVATION_PROVIDER,
    MOCK_API_KEYS_PROVIDER,
    MOCK_EMAILS_PROVIDER,
    MOCK_INTEGRATIONS_PROVIDER,
    MOCK_METRICS_PROVIDER,
    MOCK_SUPPORT_PROVIDER,
    MOCK_PROJECT_PROVIDER,
  ]);
}
