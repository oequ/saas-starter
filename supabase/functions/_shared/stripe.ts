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
