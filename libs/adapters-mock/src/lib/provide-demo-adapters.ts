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
  MOCK_BILLING_PROVIDER,
  MockBillingAdapter,
} from './mock-billing.adapter';
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
    MOCK_AUTH_PROVIDER,
    MOCK_ORG_PROVIDER,
    MOCK_BILLING_PROVIDER,
    provideAppInitializer(() => {
      if (typeof window === 'undefined') {
        return;
      }
      const auth = inject(MockAuthAdapter);
      const billing = inject(MockBillingAdapter);
      const org = inject(MockOrgAdapter);
      window.__oequResetMock = () => {
        auth.resetMockState();
        billing.resetMockState();
        org.resetMockState();
        void org.selectOrganization('acme');
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
