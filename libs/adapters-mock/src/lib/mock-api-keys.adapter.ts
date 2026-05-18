import { Injectable } from '@angular/core';
import {
  API_KEYS_PORT,
  type ApiKey,
  type ApiKeysPort,
  type CreateApiKeyInput,
  type CreatedApiKey,
  type OrganizationId,
  portErr,
  portOk,
  type PortResult,
} from '@oequ/ports';

import { cloneMockApiKeysSeed } from './data/mock-api-keys-data';

const DEMO_API_KEYS_SNAPSHOT_KEY = 'oequ-demo-api-keys';
const MOCK_LATENCY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomSecret(): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 24; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `oeq_${suffix}`;
}

function tokenPrefixFromSecret(secret: string): string {
  return `${secret.slice(0, 12)}…`;
}

function readSnapshot(): Map<string, ApiKey[]> | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(DEMO_API_KEYS_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, ApiKey[]>;
    return new Map(
      Object.entries(parsed).map(([orgId, keys]) => [
        orgId,
        keys.map((key) => ({ ...key })),
      ]),
    );
  } catch {
    return null;
  }
}

function writeSnapshot(keysByOrg: Map<string, ApiKey[]>): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  const record: Record<string, ApiKey[]> = {};
  for (const [orgId, keys] of keysByOrg) {
    record[orgId] = keys;
  }
  sessionStorage.setItem(DEMO_API_KEYS_SNAPSHOT_KEY, JSON.stringify(record));
}

@Injectable()
export class MockApiKeysAdapter implements ApiKeysPort {
  private keysByOrg = readSnapshot() ?? cloneMockApiKeysSeed();

  resetMockState(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DEMO_API_KEYS_SNAPSHOT_KEY);
    }
    this.keysByOrg = cloneMockApiKeysSeed();
  }

  clearOrganization(organizationId: OrganizationId): void {
    this.keysByOrg.delete(organizationId);
    this.persist();
  }

  async listKeys(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly ApiKey[]>> {
    await delay(MOCK_LATENCY_MS);
    const keys = this.keysByOrg.get(organizationId) ?? [];
    return portOk(keys.map((key) => ({ ...key })));
  }

  async createKey(
    organizationId: OrganizationId,
    input: CreateApiKeyInput,
  ): Promise<PortResult<CreatedApiKey>> {
    const name = input.name.trim();
    if (!name) {
      return portErr({ code: 'VALIDATION', message: 'Name is required' });
    }

    await delay(MOCK_LATENCY_MS);

    const secret = randomSecret();
    const key: ApiKey = {
      id: `key_${crypto.randomUUID?.() ?? String(Date.now())}`,
      organizationId,
      name,
      tokenPrefix: tokenPrefixFromSecret(secret),
      permission: input.permission,
      domainScope: input.domainScope,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };

    const list = [...(this.keysByOrg.get(organizationId) ?? []), key];
    this.keysByOrg.set(organizationId, list);
    this.persist();

    return portOk({ key, secret });
  }

  async revokeKey(
    organizationId: OrganizationId,
    keyId: string,
  ): Promise<PortResult<void>> {
    await delay(MOCK_LATENCY_MS);

    const list = this.keysByOrg.get(organizationId) ?? [];
    const next = list.filter((key) => key.id !== keyId);
    if (next.length === list.length) {
      return portErr({ code: 'NOT_FOUND', message: 'API key not found' });
    }

    this.keysByOrg.set(organizationId, next);
    this.persist();
    return portOk(undefined);
  }

  private persist(): void {
    writeSnapshot(this.keysByOrg);
  }
}

export const MOCK_API_KEYS_PROVIDER = {
  provide: API_KEYS_PORT,
  useExisting: MockApiKeysAdapter,
};
