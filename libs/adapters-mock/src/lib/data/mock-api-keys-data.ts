import type { ApiKey } from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './mock-data';

const NOVA_ID = MOCK_ORGANIZATIONS[1].id;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Parcel starts with no keys so onboarding can require creating the first one. */
export const MOCK_API_KEYS_SEED: readonly ApiKey[] = [
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
