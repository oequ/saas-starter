import { corsHeaders, handleCors, jsonResponse } from '../_shared/cors.ts';
import {
  checkoutQuantityForPlan,
  getStripe,
  priceIdForPlan,
} from '../_shared/stripe.ts';
import {
  assertOrgAdmin,
  createServiceClient,
  createUserClient,
  requireUser,
} from '../_shared/supabase-clients.ts';

interface CheckoutBody {
  organization_id?: string;
  plan_id?: string;
  return_url?: string;
  /** Hint from client; server uses Postgres `seats_used` for Team quantity. */
  seat_quantity?: number;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    const body = (await req.json()) as CheckoutBody;
    const organizationId = body.organization_id?.trim();
    const planId = body.plan_id?.trim().toLowerCase();
    const returnUrl = body.return_url?.trim();

    if (!organizationId || !planId || !returnUrl) {
      return jsonResponse({ error: 'missing required fields' }, 400);
    }

    if (planId !== 'pro' && planId !== 'team') {
      return jsonResponse({ error: 'invalid plan_id' }, 400);
    }

    const userClient = createUserClient(req);
    const user = await requireUser(userClient);
    await assertOrgAdmin(userClient, organizationId, user.id);

    const admin = createServiceClient();
    const stripe = getStripe();

    const { data: existing } = await admin
      .from('organization_billing')
      .select('external_customer_id')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .maybeSingle();

    let customerId = existing?.external_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { organization_id: organizationId },
      });
      customerId = customer.id;

      const { error: linkError } = await admin.rpc(
        'link_organization_stripe_customer',
        {
          p_organization_id: organizationId,
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: null,
          p_subscription_status: 'none',
        },
      );

      if (linkError) {
        console.error('link_organization_stripe_customer', linkError);
        return jsonResponse({ error: 'failed to link customer' }, 500);
      }
    }

    const { data: billingRow } = await admin
      .from('organization_billing')
      .select('external_subscription_id, subscription_status')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .maybeSingle();

    const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);
    if (
      billingRow?.external_subscription_id &&
      ACTIVE_STATUSES.has(billingRow.subscription_status)
    ) {
      return jsonResponse(
        { error: 'organization already has an active subscription' },
        409,
      );
    }

    const { data: billingSnapshot, error: snapshotError } = await userClient.rpc(
      'get_organization_billing_snapshot',
      { p_organization_id: organizationId },
    );

    if (snapshotError) {
      console.error('get_organization_billing_snapshot', snapshotError);
      return jsonResponse({ error: 'failed to load billing snapshot' }, 500);
    }

    const seatsUsed =
      typeof billingSnapshot === 'object' &&
        billingSnapshot !== null &&
        'seats_used' in billingSnapshot
        ? Number((billingSnapshot as { seats_used: number }).seats_used)
        : 1;

    const quantity = checkoutQuantityForPlan(planId, seatsUsed);
    const priceId = priceIdForPlan(planId);
    const successUrl = returnUrl.includes('?')
      ? `${returnUrl}&checkout=success`
      : `${returnUrl}?checkout=success`;
    const cancelUrl = returnUrl.includes('?')
      ? `${returnUrl}&checkout=cancel`
      : `${returnUrl}?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
        seat_quantity: String(quantity),
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          plan_id: planId,
          seat_quantity: String(quantity),
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      return jsonResponse({ error: 'checkout session has no url' }, 500);
    }

    return jsonResponse({ url: session.url });
  } catch (err) {
    if (err instanceof Response) {
      return new Response(err.body, {
        status: err.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'unknown error' },
      500,
    );
  }
});
