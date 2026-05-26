import {
  corsHeadersForRequest,
  handleCors,
  jsonResponse,
} from '../_shared/cors.ts';
import { getStripe } from '../_shared/stripe.ts';
import {
  assertOrgAdmin,
  createServiceClient,
  createUserClient,
  requireUser,
} from '../_shared/supabase-clients.ts';

interface PortalBody {
  organization_id?: string;
  return_url?: string;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    const body = (await req.json()) as PortalBody;
    const organizationId = body.organization_id?.trim();
    const returnUrl = body.return_url?.trim();

    if (!organizationId || !returnUrl) {
      return jsonResponse({ error: 'missing required fields' }, 400);
    }

    const userClient = createUserClient(req);
    const user = await requireUser(userClient);
    await assertOrgAdmin(userClient, organizationId, user.id);

    const admin = createServiceClient();
    const { data: billingRow, error } = await admin
      .from('organization_billing')
      .select('external_customer_id')
      .eq('organization_id', organizationId)
      .eq('provider', 'stripe')
      .maybeSingle();

    if (error || !billingRow?.external_customer_id) {
      return jsonResponse({ error: 'no stripe customer for organization' }, 400);
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: billingRow.external_customer_id as string,
      return_url: returnUrl,
    });

    return jsonResponse({ url: session.url });
  } catch (err) {
    if (err instanceof Response) {
      return new Response(err.body, {
        status: err.status,
        headers: { ...corsHeadersForRequest(req), 'Content-Type': 'application/json' },
      });
    }
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'unknown error' },
      500,
    );
  }
});
