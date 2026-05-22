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
  MockActivationAdapter,
} from './mock-activation.adapter';
import {
  MockApiKeysAdapter,
} from './mock-api-keys.adapter';
import {
  MockEmailsAdapter,
} from './mock-emails.adapter';
import {
  MockIntegrationsAdapter,
} from './mock-integrations.adapter';
import {
  MockBillingAdapter,
} from './mock-billing.adapter';
import { provideMockNonAuthAdapters } from './provide-mock-non-auth-adapters';
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
    MOCK_AUTH_PROVIDER,
    {
      provide: DEMO_AUTH_EXTENSION,
      useExisting: MockAuthAdapter,
    },
    MOCK_ORG_PROVIDER,
    provideMockNonAuthAdapters(),
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
