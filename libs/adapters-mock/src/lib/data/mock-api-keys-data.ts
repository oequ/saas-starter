import type { ApiKey } from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './mock-data';

const PARCEL_ID = MOCK_ORGANIZATIONS[0].id;
const NOVA_ID = MOCK_ORGANIZATIONS[1].id;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const MOCK_API_KEYS_SEED: readonly ApiKey[] = [
  {
    id: 'key_parcel_onboarding',
    organizationId: PARCEL_ID,
    name: 'Onboarding',
    tokenPrefix: 'oeq_6r34e9hM…',
    permission: 'sending_access',
    domainScope: 'all_domains',
    createdAt: hoursAgo(5),
    lastUsedAt: null,
  },
  {
    id: 'key_parcel_plotpack',
    organizationId: PARCEL_ID,
    name: 'plotpack',
    tokenPrefix: 'oeq_8kLm2pQx…',
    permission: 'sending_access',
    domainScope: 'all_domains',
    createdAt: daysAgo(30),
    lastUsedAt: hoursAgo(19),
  },
  {
    id: 'key_parcel_admin',
    organizationId: PARCEL_ID,
    name: 'CI deploy',
    tokenPrefix: 'oeq_3nP9wRtY…',
    permission: 'full_access',
    domainScope: 'all_domains',
    createdAt: daysAgo(14),
    lastUsedAt: hoursAgo(2),
  },
  {
    id: 'key_nova_main',
    organizationId: NOVA_ID,
    name: 'Production',
    tokenPrefix: 'oeq_1aB5cDeF…',
    permission: 'full_access',
    domainScope: 'all_domains',
    createdAt: daysAgo(7),
    lastUsedAt: hoursAgo(48),
  },
];

export function cloneMockApiKeysSeed(): Map<string, ApiKey[]> {
  const map = new Map<string, ApiKey[]>();
  for (const key of MOCK_API_KEYS_SEED) {
    const list = map.get(key.organizationId) ?? [];
    list.push({ ...key });
    map.set(key.organizationId, list);
  }
  return map;
}
