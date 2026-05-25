import Stripe from 'npm:stripe@17.7.0';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeClient = new Stripe(key, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeClient;
}

export function priceIdForPlan(planId: string): string {
  const normalized = planId.toLowerCase().trim();
  if (normalized === 'pro') {
    const id = Deno.env.get('STRIPE_PRICE_PRO');
    if (!id) throw new Error('STRIPE_PRICE_PRO is not set');
    return id;
  }
  if (normalized === 'team') {
    const id = Deno.env.get('STRIPE_PRICE_TEAM');
    if (!id) throw new Error('STRIPE_PRICE_TEAM is not set');
    return id;
  }
  throw new Error(`Unsupported plan_id for checkout: ${planId}`);
}

export const TEAM_PLAN_MAX_SEATS = 50;

/** Team uses per-unit Stripe price × quantity; Pro is flat (quantity 1). */
export function isPerSeatPlan(planId: string): boolean {
  return planId.toLowerCase().trim() === 'team';
}

export function subscriptionLineQuantity(
  subscription: Stripe.Subscription,
): number {
  const qty = subscription.items.data[0]?.quantity;
  return typeof qty === 'number' && qty > 0 ? Math.floor(qty) : 1;
}

/** When non-null, passed to `apply_billing_subscription` as `p_seats_limit`. */
export function seatsLimitOverrideForSubscription(
  planId: string,
  subscription: Stripe.Subscription,
): number | null {
  if (!isPerSeatPlan(planId)) {
    return null;
  }
  const qty = subscriptionLineQuantity(subscription);
  return Math.min(TEAM_PLAN_MAX_SEATS, Math.max(1, qty));
}

export function checkoutQuantityForPlan(
  planId: string,
  seatsUsed: number,
): number {
  const normalized = planId.toLowerCase().trim();
  if (normalized === 'team') {
    const used = Number.isFinite(seatsUsed) ? Math.floor(seatsUsed) : 1;
    return Math.min(TEAM_PLAN_MAX_SEATS, Math.max(1, used));
  }
  return 1;
}

export function planIdFromSubscription(
  subscription: Stripe.Subscription,
): 'free' | 'pro' | 'team' {
  const meta = subscription.metadata?.plan_id?.toLowerCase();
  if (meta === 'pro' || meta === 'team' || meta === 'free') {
    return meta;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_PRO')) {
    return 'pro';
  }
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_TEAM')) {
    return 'team';
  }

  return 'free';
}

export function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): string {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'unpaid';
    case 'paused':
      return 'paused';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'none';
  }
}

export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();
