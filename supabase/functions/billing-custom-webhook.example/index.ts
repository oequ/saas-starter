/**
 * Example: custom payment provider webhook (YooKassa, CloudPayments, invoice, etc.).
 * Copy to `billing-custom-webhook/` and register in supabase/config.toml.
 *
 * Contract:
 * 1. Verify provider signature (your secret).
 * 2. recordBillingEvent(admin, 'your_provider', eventId, eventType)
 * 3. Map payload → applyBillingSubscription(...) with plan_id + external ids
 *
 * See docs/BILLING_CUSTOM_PROVIDER.md
 */
import {
  applyBillingSubscription,
  recordBillingEvent,
  deleteBillingEvent,
} from '../_shared/billing-rpc.ts';
import { createServiceClient } from '../_shared/supabase-clients.ts';

const PROVIDER_ID = 'custom';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const admin = createServiceClient();
  const body = await req.json();
  const eventId = String(body?.id ?? '');
  const eventType = String(body?.type ?? 'unknown');

  if (!eventId) {
    return new Response('missing event id', { status: 400 });
  }

  try {
    const recorded = await recordBillingEvent(
      admin,
      PROVIDER_ID,
      eventId,
      eventType,
    );
    if (recorded === 'duplicate') {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: verify signature, parse body, then e.g.:
    // await applyBillingSubscription(admin, {
    //   organizationId: body.organization_id,
    //   planId: 'pro',
    //   provider: PROVIDER_ID,
    //   externalCustomerId: body.customer_id,
    //   externalSubscriptionId: body.subscription_id ?? null,
    //   subscriptionStatus: 'active',
    //   currentPeriodEnd: null,
    //   cancelAtPeriodEnd: false,
    // });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    await deleteBillingEvent(admin, PROVIDER_ID, eventId);
    console.error('custom webhook failed', err);
    return new Response('webhook processing failed', { status: 500 });
  }
});
