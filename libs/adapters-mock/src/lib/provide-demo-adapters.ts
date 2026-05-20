import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

import { DEMO_AUTH_EXTENSION } from '@oequ/ports';
import {
  MOCK_AUTH_PROVIDER,
  MockAuthAdapter,
} from './mock-auth.adapter';
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
import {
  MOCK_ORG_PROVIDER,
  MockOrgAdapter,
} from './mock-org.adapter';

declare global {
  interface Window {
    __oequResetMock?: () => void;
    __oequSetZeroOrgs?: () => void;
    __oequOrganizationCount?: () => number;
    __oequSelectWorkspace?: (slug: string) => Promise<void>;
  }
}

export function provideDemoAdapters(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MockAuthAdapter,
    MockOrgAdapter,
    MockBillingAdapter,
    MockActivationAdapter,
    MockApiKeysAdapter,
    MockEmailsAdapter,
    MockIntegrationsAdapter,
    MockMetricsAdapter,
    MockSupportAdapter,
    MOCK_AUTH_PROVIDER,
    {
      provide: DEMO_AUTH_EXTENSION,
      useExisting: MockAuthAdapter,
    },
    MOCK_ORG_PROVIDER,
    MOCK_BILLING_PROVIDER,
    MOCK_ACTIVATION_PROVIDER,
    MOCK_API_KEYS_PROVIDER,
    MOCK_EMAILS_PROVIDER,
    MOCK_INTEGRATIONS_PROVIDER,
    MOCK_METRICS_PROVIDER,
    MOCK_SUPPORT_PROVIDER,
    provideAppInitializer(() => {
      if (typeof window === 'undefined') {
        return;
      }
      const auth = inject(MockAuthAdapter);
      const billing = inject(MockBillingAdapter);
      const activation = inject(MockActivationAdapter);
      const apiKeys = inject(MockApiKeysAdapter);
      const emails = inject(MockEmailsAdapter);
      const integrations = inject(MockIntegrationsAdapter);
      const org = inject(MockOrgAdapter);
      window.__oequResetMock = () => {
        auth.resetMockState();
        billing.resetMockState();
        activation.resetMockState();
        apiKeys.resetMockState();
        emails.resetMockState();
        integrations.resetMockState();
        org.resetMockState();
        void org.selectOrganization('parcel');
      };
      window.__oequSetZeroOrgs = () => {
        org.setZeroOrganizations();
      };
      window.__oequOrganizationCount = () => org.organizationCount();
      window.__oequSelectWorkspace = async (slug) => {
        await org.selectOrganization(slug);
      };
    }),
  ]);
}
