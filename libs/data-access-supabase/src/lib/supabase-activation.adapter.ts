import { inject, Injectable } from '@angular/core';
import {
  ACTIVATION_PORT,
  type ActivationPort,
  type ActivationStatus,
  type OrganizationId,
  portOk,
  type PortResult,
} from '@oequ/ports';

import { SupabaseClientService } from './supabase-client.service';
import { supabaseErr } from './supabase-port-error';
import { supabaseErrFromRpc } from './supabase-rpc-error';

@Injectable()
export class SupabaseActivationAdapter implements ActivationPort {
  private readonly supabase = inject(SupabaseClientService);

  async getStatus(
    organizationId: OrganizationId,
  ): Promise<PortResult<ActivationStatus>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc(
      'get_organization_activation_status',
      { p_organization_id: organizationId },
    );

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const status = data as ActivationStatus;
    if (status !== 'pending' && status !== 'complete') {
      return portOk('pending');
    }

    return portOk(status);
  }

  async markComplete(
    organizationId: OrganizationId,
  ): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { error } = await client.rpc('mark_organization_activation_complete', {
      p_organization_id: organizationId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(undefined);
  }
}

export const SUPABASE_ACTIVATION_PROVIDER = {
  provide: ACTIVATION_PORT,
  useExisting: SupabaseActivationAdapter,
};
