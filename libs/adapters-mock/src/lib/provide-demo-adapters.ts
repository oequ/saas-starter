import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';

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
    MockMetricsAdapter,
    MockSupportAdapter,
    MOCK_AUTH_PROVIDER,
    MOCK_ORG_PROVIDER,
    MOCK_BILLING_PROVIDER,
    MOCK_ACTIVATION_PROVIDER,
    MOCK_API_KEYS_PROVIDER,
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
      const org = inject(MockOrgAdapter);
      window.__oequResetMock = () => {
        auth.resetMockState();
        billing.resetMockState();
        activation.resetMockState();
        apiKeys.resetMockState();
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
