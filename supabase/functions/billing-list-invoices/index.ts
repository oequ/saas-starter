import {
  corsHeadersForRequest,
  handleCors,
  jsonResponse,
} from '../_shared/cors.ts';
import {
  mapStripeInvoice,
  parseInvoiceListRpc,
  type InvoiceListPageDto,
} from '../_shared/billing-invoices.ts';
import { BILLING_PROVIDER_STRIPE } from '../_shared/billing-rpc.ts';
import { getStripe } from '../_shared/stripe.ts';
import {
  assertOrgAdmin,
  createServiceClient,
  createUserClient,
  requireUser,
} from '../_shared/supabase-clients.ts';

interface ListInvoicesBody {
  organization_id?: string;
  cursor?: string;
}

const PAGE_LIMIT = 24;

async function listFromPostgres(
  userClient: ReturnType<typeof createUserClient>,
  organizationId: string,
  cursor?: string,
): Promise<InvoiceListPageDto> {
  const { data, error } = await userClient.rpc('list_organization_invoices', {
    p_organization_id: organizationId,
    p_limit: PAGE_LIMIT,
    p_cursor: cursor ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseInvoiceListRpc(data);
}

async function listFromStripe(
  customerId: string,
  cursor?: string,
): Promise<InvoiceListPageDto> {
  const response = await getStripe().invoices.list({
    customer: customerId,
    limit: PAGE_LIMIT,
    ...(cursor ? { starting_after: cursor } : {}),
  });

  const items = response.data.map((invoice) => mapStripeInvoice(invoice));
  const nextCursor = response.has_more
    ? (items[items.length - 1]?.id ?? null)
    : null;

  return { items, nextCursor };
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    const body = (await req.json()) as ListInvoicesBody;
    const organizationId = body.organization_id?.trim();
    const cursor = body.cursor?.trim() || undefined;

    if (!organizationId) {
      return jsonResponse({ error: 'missing organization_id' }, 400);
    }

    const userClient = createUserClient(req);
    const user = await requireUser(userClient);
    await assertOrgAdmin(userClient, organizationId, user.id);

    const admin = createServiceClient();
    const { data: billingRow, error: billingError } = await admin
      .from('organization_billing')
      .select('provider, external_customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (billingError) {
      console.error('organization_billing select', billingError);
      return jsonResponse({ error: 'failed to load billing' }, 500);
    }

    const provider = (billingRow?.provider as string | undefined)?.toLowerCase();
    const customerId = billingRow?.external_customer_id as string | undefined;

    let page: InvoiceListPageDto;

    if (provider === BILLING_PROVIDER_STRIPE) {
      if (!customerId) {
        return jsonResponse(
          { error: 'no billing customer for organization' },
          400,
        );
      }
      page = await listFromStripe(customerId, cursor);
    } else {
      page = await listFromPostgres(userClient, organizationId, cursor);
    }

    return jsonResponse(page);
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
