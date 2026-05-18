import { Injectable } from '@angular/core';
import {
  ACTIVATION_PORT,
  type ActivationPort,
  type ActivationStatus,
  type OrganizationId,
  portOk,
  type PortResult,
} from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './data/mock-data';

/** Default demo workspace — activation onboarding not completed until user finishes it. */
const PARCEL_ORG_ID = MOCK_ORGANIZATIONS[0].id;

const STORAGE_PREFIX = 'oequ:activation:';

function readStatus(organizationId: OrganizationId): ActivationStatus | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${organizationId}`);
  if (raw === 'pending' || raw === 'complete') {
    return raw;
  }
  return null;
}

function writeStatus(
  organizationId: OrganizationId,
  status: ActivationStatus,
): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(`${STORAGE_PREFIX}${organizationId}`, status);
}

function removeStatus(organizationId: OrganizationId): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(`${STORAGE_PREFIX}${organizationId}`);
}

@Injectable()
export class MockActivationAdapter implements ActivationPort {
  private readonly mockOrgIds = new Set(
    MOCK_ORGANIZATIONS.map((org) => org.id),
  );

  private readonly defaultCompleteIds = new Set(
    [...this.mockOrgIds].filter((id) => id !== PARCEL_ORG_ID),
  );

  resetMockState(): void {
    for (const org of MOCK_ORGANIZATIONS) {
      writeStatus(org.id, 'complete');
    }
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          const id = key.slice(STORAGE_PREFIX.length);
          if (!this.mockOrgIds.has(id)) {
            keysToRemove.push(key);
          }
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    }
  }

  clearOrganization(organizationId: OrganizationId): void {
    removeStatus(organizationId);
  }

  seedPending(organizationId: OrganizationId): void {
    writeStatus(organizationId, 'pending');
  }

  async getStatus(
    organizationId: OrganizationId,
  ): Promise<PortResult<ActivationStatus>> {
    const stored = readStatus(organizationId);
    if (stored) {
      return portOk(stored);
    }
    if (this.defaultCompleteIds.has(organizationId)) {
      return portOk('complete');
    }
    return portOk('pending');
  }

  async markComplete(
    organizationId: OrganizationId,
  ): Promise<PortResult<void>> {
    writeStatus(organizationId, 'complete');
    return portOk(undefined);
  }
}

export const MOCK_ACTIVATION_PROVIDER = {
  provide: ACTIVATION_PORT,
  useExisting: MockActivationAdapter,
};
