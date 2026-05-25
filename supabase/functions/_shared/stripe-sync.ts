import type Stripe from 'npm:stripe@17.7.0';
import {
  applyBillingSubscription,
  BILLING_PROVIDER_STRIPE,
} from './billing-rpc.ts';
import {
  mapSubscriptionStatus,
  planIdFromSubscription,
  seatsLimitOverrideForSubscription,
} from './stripe.ts';
import type { createServiceClient } from './supabase-clients.ts';

function planIdFromStripeSubscription(
  subscription: Stripe.Subscription,
): string {
  if (
    subscription.status === 'canceled' ||
    subscription.status === 'incomplete_expired'
  ) {
    return 'free';
  }
  return planIdFromSubscription(subscription);
}

export async function syncStripeSubscription(
  admin: ReturnType<typeof createServiceClient>,
  organizationId: string,
  customerId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const planId = planIdFromStripeSubscription(subscription);
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await applyBillingSubscription(admin, {
    organizationId,
    planId,
    provider: BILLING_PROVIDER_STRIPE,
    externalCustomerId: customerId,
    externalSubscriptionId: subscription.id,
    subscriptionStatus: mapSubscriptionStatus(subscription.status),
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    seatsLimit: seatsLimitOverrideForSubscription(planId, subscription),
  });
}
