import {
  corsHeadersForRequest,
  handleCors,
  jsonResponse,
} from '../_shared/cors.ts';
import {
  assertOrgAdmin,
  createServiceClient,
  createUserClient,
  requireUser,
} from '../_shared/supabase-clients.ts';

interface SyncBody {
  organization_id?: string;
  plan_id?: string;
  seats_limit?: number | null;
}

function resolveBillingProvider(): string {
  const raw = Deno.env.get('BILLING_PROVIDER')?.trim().toLowerCase();
  if (raw === 'stripe' || raw === 'custom' || raw === 'mock') {
    return raw;
  }
  return 'mock';
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    // Stripe / custom deploys must not expose unpaid plan upgrades.
    if (resolveBillingProvider() !== 'mock') {
      return jsonResponse({ error: 'mock billing sync disabled' }, 403);
    }

    const body = (await req.json()) as SyncBody;
    const organizationId = body.organization_id?.trim();
    const planId = body.plan_id?.trim().toLowerCase();

    if (!organizationId || !planId) {
      return jsonResponse({ error: 'missing required fields' }, 400);
    }

    if (!['free', 'pro', 'team'].includes(planId)) {
      return jsonResponse({ error: 'invalid plan id' }, 400);
    }

    const userClient = createUserClient(req);
    const user = await requireUser(userClient);
    await assertOrgAdmin(userClient, organizationId, user.id);

    const seatsLimit =
      body.seats_limit === undefined || body.seats_limit === null
        ? null
        : Number(body.seats_limit);

    const admin = createServiceClient();
    const { data, error } = await admin.rpc('update_organization_plan', {
      p_organization_id: organizationId,
      p_plan_id: planId,
      p_seats_limit: Number.isFinite(seatsLimit as number)
        ? seatsLimit
        : null,
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({ ok: true, data });
  } catch (err) {
    if (err instanceof Response) {
      return new Response(err.body, {
        status: err.status,
        headers: {
          ...corsHeadersForRequest(req),
          'Content-Type': 'application/json',
        },
      });
    }
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'unknown error' },
      500,
    );
  }
});
