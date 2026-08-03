import {
  MockActivationAdapter,
  MockApiKeysAdapter,
  MockAuthAdapter,
  MockBillingAdapter,
  MockOrgAdapter,
} from '@oequ/adapters-mock';
import type { AuthPort, OrgPort } from '@oequ/ports';

/** Ports for the React shell (mock composition). */
export type DemoPorts = {
  auth: AuthPort;
  org: OrgPort;
};

/** Composition root — plain `new`, no Angular DI. */
export function createDemoPorts(): DemoPorts {
  const mockAuth = new MockAuthAdapter(null);
  const billing = new MockBillingAdapter();
  const activation = new MockActivationAdapter();
  const apiKeys = new MockApiKeysAdapter();
  const mockOrg = new MockOrgAdapter(mockAuth, billing, activation, apiKeys);
  return {
    auth: mockAuth,
    org: mockOrg,
  };
}
