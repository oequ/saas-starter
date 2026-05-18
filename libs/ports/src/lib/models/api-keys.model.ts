import type { OrganizationId } from './org.model';

export type ApiKeyPermission = 'full_access' | 'sending_access';

export type ApiKeyDomainScope = 'all_domains';

export interface ApiKey {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly name: string;
  /** Masked token prefix shown in lists (e.g. `oeq_a1b2c3d4…`). */
  readonly tokenPrefix: string;
  readonly permission: ApiKeyPermission;
  readonly domainScope: ApiKeyDomainScope;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
}

export interface CreateApiKeyInput {
  readonly name: string;
  readonly permission: ApiKeyPermission;
  readonly domainScope: ApiKeyDomainScope;
}

export interface CreatedApiKey {
  readonly key: ApiKey;
  /** Full secret — only returned once at creation time. */
  readonly secret: string;
}
