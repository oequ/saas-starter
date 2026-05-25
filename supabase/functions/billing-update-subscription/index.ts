import Stripe from 'npm:stripe@17.7.0';
import { corsHeaders, handleCors, jsonResponse } from '../_shared/cors.ts';
import { BILLING_PROVIDER_STRIPE } from '../_shared/billing-rpc.ts';
import {
  checkoutQuantityForPlan,
  getStripe,
  isPerSeatPlan,
  subscriptionLineQuantity,
  TEAM_PLAN_MAX_SEATS,
} from '../_shared/stripe.ts';
import { syncStripeSubscription } from '../_shared/stripe-sync.ts';
import {
  assertOrgAdmin,
  createServiceClient,
  createUserClient,
  requireUser,
} from '../_shared/supabase-clients.ts';

interface UpdateBody {
  organization_id?: string;
  seat_quantity?: number;
}

const BILLABLE_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
]);

function parseBillingSnapshot(data: unknown): {
  planId: string;
  seatsUsed: number;
  subscriptionStatus: string;
  cancelAtPeriodEnd: boolean;
} | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    planId: String(row.plan_id ?? 'free').toLowerCase(),
    seatsUsed: Number(row.seats_used ?? 0),
    subscriptionStatus: String(row.subscription_status ?? 'none'),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  };
}

function resolveTargetQuantity(
  planId: string,
  seatsUsed: number,
  requested?: number,
): number {
  if (requested !== undefined && Number.isFinite(requested)) {
    return Math.min(
      TEAM_PLAN_MAX_SEATS,
      Math.max(1, Math.floor(requested)),
    );
  }
  return checkoutQuantityForPlan(planId, seatsUsed + 1);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    const body = (await req.json()) as UpdateBody;
    const organizationId = body.organization_id?.trim();

    if (!organizationId) {
      return jsonResponse({ error: 'missing organization_id' }, 400);
    }

    const userClient = createUserClient(req);
    const user = await requireUser(userClient);
    await assertOrgAdmin(userClient, organizationId, user.id);

    const admin = createServiceClient();

    const { data: snapshotData, error: snapshotError } = await admin.rpc(
      'get_organization_billing_snapshot',
      { p_organization_id: organizationId },
    );

    if (snapshotError) {
      console.error('get_organization_billing_snapshot', snapshotError);
      return jsonResponse({ error: 'failed to load billing snapshot' }, 500);
    }

    const snapshot = parseBillingSnapshot(snapshotData);
    if (!snapshot) {
      return jsonResponse({ error: 'invalid billing snapshot' }, 500);
    }

    if (!isPerSeatPlan(snapshot.planId)) {
      return jsonResponse({ error: 'not_per_seat_plan' }, 400);
    }

    if (snapshot.cancelAtPeriodEnd) {
      return jsonResponse({ error: 'subscription_canceling' }, 409);
    }

    const { data: billingRow, error: billingError } = await admin
      .from('organization_billing')
      .select(
        'external_customer_id, external_subscription_id, subscription_status',
      )
      .eq('organization_id', organizationId)
      .eq('provider', BILLING_PROVIDER_STRIPE)
      .maybeSingle();

    if (billingError) {
      console.error('organization_billing select', billingError);
      return jsonResponse({ error: 'failed to load billing' }, 500);
    }

    const subscriptionId = billingRow?.external_subscription_id as
      | string
      | undefined;
    const customerId = billingRow?.external_customer_id as string | undefined;

    if (!subscriptionId || !customerId) {
      return jsonResponse(
        { error: 'no active stripe subscription for organization' },
        400,
      );
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!BILLABLE_STATUSES.has(subscription.status)) {
      return jsonResponse({ error: 'subscription_not_billable' }, 409);
    }

    if (subscription.cancel_at_period_end) {
      return jsonResponse({ error: 'subscription_canceling' }, 409);
    }

    const item = subscription.items.data[0];
    if (!item?.id) {
      return jsonResponse({ error: 'subscription_has_no_items' }, 500);
    }

    const currentQuantity = subscriptionLineQuantity(subscription);
    const targetQuantity = resolveTargetQuantity(
      snapshot.planId,
      snapshot.seatsUsed,
      body.seat_quantity,
    );

    if (targetQuantity > TEAM_PLAN_MAX_SEATS) {
      return jsonResponse({ error: 'team_seat_cap_reached' }, 400);
    }

    const minQuantity = Math.max(1, Math.floor(snapshot.seatsUsed));

    if (targetQuantity === currentQuantity) {
      return jsonResponse({
        ok: true,
        unchanged: true,
        quantity: currentQuantity,
        seats_limit: currentQuantity,
      });
    }

    if (targetQuantity < currentQuantity) {
      if (targetQuantity < minQuantity) {
        return jsonResponse({ error: 'quantity_below_usage' }, 400);
      }
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, quantity: targetQuantity }],
      proration_behavior: 'create_prorations',
    });

    await syncStripeSubscription(
      admin,
      organizationId,
      customerId,
      updated,
    );

    const seatsLimit = Math.min(
      TEAM_PLAN_MAX_SEATS,
      Math.max(1, subscriptionLineQuantity(updated)),
    );

    return jsonResponse({
      ok: true,
      unchanged: false,
      quantity: seatsLimit,
      seats_limit: seatsLimit,
    });
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
