import { InjectionToken } from '@angular/core';

import type {
  ApiKey,
  CreateApiKeyInput,
  CreatedApiKey,
} from './models/api-keys.model';
import type { PortResult } from './models/common.model';
import type { OrganizationId } from './models/org.model';

export interface ApiKeysPort {
  listKeys(organizationId: OrganizationId): Promise<PortResult<readonly ApiKey[]>>;

  createKey(
    organizationId: OrganizationId,
    input: CreateApiKeyInput,
  ): Promise<PortResult<CreatedApiKey>>;

  revokeKey(
    organizationId: OrganizationId,
    keyId: string,
  ): Promise<PortResult<void>>;
}

export const API_KEYS_PORT = new InjectionToken<ApiKeysPort>('API_KEYS_PORT');
