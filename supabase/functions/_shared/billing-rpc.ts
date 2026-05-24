import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

export const BILLING_PROVIDER_STRIPE = 'stripe';

export interface ApplyBillingSubscriptionParams {
  organizationId: string;
  planId: string;
  provider: string;
  externalCustomerId: string;
  externalSubscriptionId: string | null;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function applyBillingSubscription(
  admin: SupabaseClient,
  params: ApplyBillingSubscriptionParams,
): Promise<void> {
  const { error } = await admin.rpc('apply_billing_subscription', {
    p_organization_id: params.organizationId,
    p_plan_id: params.planId,
    p_provider: params.provider,
    p_external_customer_id: params.externalCustomerId,
    p_external_subscription_id: params.externalSubscriptionId,
    p_subscription_status: params.subscriptionStatus,
    p_current_period_end: params.currentPeriodEnd,
    p_cancel_at_period_end: params.cancelAtPeriodEnd,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function recordBillingEvent(
  admin: SupabaseClient,
  provider: string,
  externalEventId: string,
  eventType: string,
): Promise<'inserted' | 'duplicate'> {
  const { error: insertError } = await admin.from('billing_events').insert({
    provider,
    external_event_id: externalEventId,
    event_type: eventType,
  });

  if (insertError?.code === '23505') {
    return 'duplicate';
  }

  if (insertError) {
    throw new Error(insertError.message);
  }

  return 'inserted';
}

export async function deleteBillingEvent(
  admin: SupabaseClient,
  provider: string,
  externalEventId: string,
): Promise<void> {
  await admin
    .from('billing_events')
    .delete()
    .eq('provider', provider)
    .eq('external_event_id', externalEventId);
}
