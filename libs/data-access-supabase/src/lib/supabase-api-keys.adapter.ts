import { inject, Injectable } from '@angular/core';
import {
  API_KEYS_PORT,
  type ApiKey,
  type ApiKeysPort,
  type CreateApiKeyInput,
  type CreatedApiKey,
  type OrganizationId,
  portOk,
  type PortResult,
} from '@oequ/ports';

import { SupabaseClientService } from './supabase-client.service';
import { supabaseErr } from './supabase-port-error';
import { supabaseErrFromRpc } from './supabase-rpc-error';

interface DbApiKeyRow {
  id: string;
  organization_id: string;
  name: string;
  token_prefix: string;
  permission: ApiKey['permission'];
  domain_scope: ApiKey['domainScope'];
  created_at: string;
  last_used_at: string | null;
}

interface CreateApiKeyRpcResult {
  key: DbApiKeyRow;
  secret: string;
}

function mapApiKey(row: DbApiKeyRow): ApiKey {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    permission: row.permission,
    domainScope: row.domain_scope,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

@Injectable()
export class SupabaseApiKeysAdapter implements ApiKeysPort {
  private readonly supabase = inject(SupabaseClientService);

  async listKeys(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly ApiKey[]>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('list_organization_api_keys', {
      p_organization_id: organizationId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const rows = (data ?? []) as DbApiKeyRow[];
    return portOk(rows.map(mapApiKey));
  }

  async createKey(
    organizationId: OrganizationId,
    input: CreateApiKeyInput,
  ): Promise<PortResult<CreatedApiKey>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('create_organization_api_key', {
      p_organization_id: organizationId,
      p_name: input.name,
      p_permission: input.permission,
      p_domain_scope: input.domainScope,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const result = data as CreateApiKeyRpcResult;
    return portOk({
      key: mapApiKey(result.key),
      secret: result.secret,
    });
  }

  async revokeKey(
    organizationId: OrganizationId,
    keyId: string,
  ): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { error } = await client.rpc('revoke_organization_api_key', {
      p_organization_id: organizationId,
      p_key_id: keyId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(undefined);
  }
}

export const SUPABASE_API_KEYS_PROVIDER = {
  provide: API_KEYS_PORT,
  useExisting: SupabaseApiKeysAdapter,
};
