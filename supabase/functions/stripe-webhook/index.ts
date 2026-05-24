import Stripe from 'npm:stripe@17.7.0';
import {
  applyBillingSubscription,
  BILLING_PROVIDER_STRIPE,
  deleteBillingEvent,
  recordBillingEvent,
} from '../_shared/billing-rpc.ts';
import {
  getStripe,
  mapSubscriptionStatus,
  planIdFromSubscription,
  stripeCryptoProvider,
} from '../_shared/stripe.ts';
import { createServiceClient } from '../_shared/supabase-clients.ts';

async function applySubscription(
  admin: ReturnType<typeof createServiceClient>,
  organizationId: string,
  customerId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const planId =
    subscription.status === 'canceled' || subscription.status === 'incomplete_expired'
      ? 'free'
      : planIdFromSubscription(subscription);

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
  });
}

async function handleCheckoutCompleted(
  admin: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const organizationId = session.metadata?.organization_id;
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!organizationId || !customerId || !subscriptionId) {
    console.warn('checkout.session.completed missing ids', session.id);
    return;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await applySubscription(admin, organizationId, customerId, subscription);
}

async function handleSubscriptionEvent(
  admin: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription,
): Promise<void> {
  const organizationId = subscription.metadata?.organization_id;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!organizationId || !customerId) {
    console.warn('subscription event missing metadata', subscription.id);
    return;
  }

  await applySubscription(admin, organizationId, customerId, subscription);
}

async function handleInvoicePaymentFailed(
  admin: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) {
    return;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await handleSubscriptionEvent(admin, subscription);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('missing stripe signature or secret', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await getStripe().webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      stripeCryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    console.error('webhook signature failed', message);
    return new Response(message, { status: 400 });
  }

  const admin = createServiceClient();

  let eventRecord: 'inserted' | 'duplicate';
  try {
    eventRecord = await recordBillingEvent(
      admin,
      BILLING_PROVIDER_STRIPE,
      event.id,
      event.type,
    );
  } catch (err) {
    console.error('billing_events insert', err);
    return new Response('failed to record event', { status: 500 });
  }

  if (eventRecord === 'duplicate') {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          admin,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(
          admin,
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          admin,
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        console.log('unhandled event', event.type);
    }
  } catch (err) {
    await deleteBillingEvent(admin, BILLING_PROVIDER_STRIPE, event.id);
    console.error('webhook handler failed', err);
    return new Response('webhook processing failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
