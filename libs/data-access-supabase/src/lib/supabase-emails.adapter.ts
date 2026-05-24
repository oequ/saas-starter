import { inject, Injectable } from '@angular/core';
import {
  EMAILS_PORT,
  type EmailListQuery,
  type EmailsPort,
  type OutboundEmail,
  type OrganizationId,
  portOk,
  type PortResult,
  type SimulateOutboundEmailsInput,
  type SimulateOutboundEmailsResult,
} from '@oequ/ports';

import { SupabaseClientService } from './supabase-client.service';
import { supabaseErr } from './supabase-port-error';
import { supabaseErrFromRpc } from './supabase-rpc-error';

interface DbOutboundEmailRow {
  id: string;
  organization_id?: string;
  organizationId?: string;
  to: string;
  subject: string;
  status: OutboundEmail['status'];
  sent_at?: string;
  sentAt?: string;
  api_key_id?: string | null;
  apiKeyId?: string | null;
  api_key_label?: string | null;
  apiKeyLabel?: string | null;
}

interface SimulateOutboundRpcResult {
  created: OutboundEmail[];
  totalSent: number;
  quotaLimit: number | null;
  requestedCount?: number;
  capped?: boolean;
}

function mapOutboundEmail(row: DbOutboundEmailRow): OutboundEmail {
  return {
    id: row.id,
    organizationId: row.organizationId ?? row.organization_id ?? '',
    to: row.to,
    subject: row.subject,
    status: row.status,
    sentAt: row.sentAt ?? row.sent_at ?? '',
    apiKeyId: row.apiKeyId ?? row.api_key_id ?? null,
    apiKeyLabel: row.apiKeyLabel ?? row.api_key_label ?? null,
  };
}

function queryToJson(query?: EmailListQuery): Record<string, string | undefined> {
  if (!query) {
    return {};
  }
  return {
    search: query.search,
    status: query.status,
    period: query.period,
    api_key_id: query.apiKeyId,
  };
}

@Injectable()
export class SupabaseEmailsAdapter implements EmailsPort {
  private readonly supabase = inject(SupabaseClientService);

  async listOutbound(
    organizationId: OrganizationId,
    query?: EmailListQuery,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly OutboundEmail[]>> {
    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('list_outbound_emails', {
      p_organization_id: organizationId,
      p_query: queryToJson(query),
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const rows = (data ?? []) as DbOutboundEmailRow[];
    return portOk(rows.map(mapOutboundEmail));
  }

  async simulateOutbound(
    organizationId: OrganizationId,
    input?: SimulateOutboundEmailsInput,
  ): Promise<PortResult<SimulateOutboundEmailsResult>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('simulate_outbound_emails', {
      p_organization_id: organizationId,
      p_input: {
        count: input?.count,
        subject: input?.subject,
        to: input?.to,
        records: input?.records,
      },
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const result = data as SimulateOutboundRpcResult;
    return portOk({
      created: (result.created ?? []).map(mapOutboundEmail),
      totalSent: result.totalSent,
      quotaLimit: result.quotaLimit,
      requestedCount: result.requestedCount,
      capped: result.capped,
    });
  }
}

export const SUPABASE_EMAILS_PROVIDER = {
  provide: EMAILS_PORT,
  useExisting: SupabaseEmailsAdapter,
};
