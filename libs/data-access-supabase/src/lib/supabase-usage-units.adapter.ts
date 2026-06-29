import { inject, Injectable } from '@angular/core';
import {
  portOk,
  type ApiUsageEvent,
  type ApiUsageEventFilter,
  type OrganizationId,
  type PortResult,
  USAGE_UNITS_PORT,
  type UsageUnitBalance,
  type UsageUnitsPort,
} from '@oequ/ports';

import { SupabaseClientService } from './supabase-client.service';
import { supabaseErr } from './supabase-port-error';
import { supabaseErrFromRpc } from './supabase-rpc-error';

interface UsageUnitBalanceRpc {
  available: number;
  monthly_allowance: number;
  reset_at: string | null;
}

interface ApiUsageEventRpcRow {
  id: string;
  created_at: string;
  event_type: string;
  endpoint: string;
  unit: string;
  quantity: number;
  http_status: number | null;
  latency_ms: number | null;
  api_key_id: string | null;
  run_id: string | null;
}

@Injectable()
export class SupabaseUsageUnitsAdapter implements UsageUnitsPort {
  private readonly supabase = inject(SupabaseClientService);

  async getBalance(
    organizationId: OrganizationId,
  ): Promise<PortResult<UsageUnitBalance>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('get_org_usage_unit_balance', {
      p_org_id: organizationId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const row = data as UsageUnitBalanceRpc | null;
    return portOk({
      available: row?.available ?? 0,
      monthlyAllowance: row?.monthly_allowance ?? 0,
      resetAt: row?.reset_at ?? null,
    });
  }

  async listApiUsageEvents(
    organizationId: OrganizationId,
    filter?: ApiUsageEventFilter,
  ): Promise<PortResult<readonly ApiUsageEvent[]>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('list_org_api_usage_events', {
      p_org_id: organizationId,
      p_limit: filter?.limit ?? 50,
      p_cursor: filter?.cursor ?? null,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    if (!Array.isArray(data)) {
      return portOk([]);
    }

    return portOk(
      (data as ApiUsageEventRpcRow[]).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        eventType: row.event_type,
        endpoint: row.endpoint,
        unit: row.unit,
        quantity: row.quantity,
        httpStatus: row.http_status,
        latencyMs: row.latency_ms,
        apiKeyId: row.api_key_id,
        runId: row.run_id,
      })),
    );
  }
}

export const SUPABASE_USAGE_UNITS_PROVIDER = {
  provide: USAGE_UNITS_PORT,
  useExisting: SupabaseUsageUnitsAdapter,
};
