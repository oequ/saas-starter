import {
  resolveCurrentPlanId,
  type BillingPlan,
  type BillingSummary,
  type CommercialPlanId,
  type Invoice,
  type InvoiceListPage,
  type PaymentMethod,
  type UsageMeter,
} from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './mock-data';

const PARCEL_ID = MOCK_ORGANIZATIONS[0].id;
const NOVA_ID = MOCK_ORGANIZATIONS[1].id;
const LUMEN_ID = MOCK_ORGANIZATIONS[2].id;

/**
 * Usage caps aligned with Resend transactional tiers (May 2026):
 * Free 3k/mo (100/day), Pro 50k/mo, Scale/Team 100k+.
 * API & webhook limits are demo extras (not on Resend pricing page).
 */
const PLAN_METER_TEMPLATES: Readonly<
  Record<CommercialPlanId, readonly UsageMeter[]>
> = {
  free: [
    {
      metricId: 'emails_sent',
      name: 'Emails sent',
      consumed: 0,
      limit: 3_000,
      dailyLimit: 100,
      dailyConsumed: 0,
      available: true,
      unit: 'emails',
    },
    {
      metricId: 'api_requests',
      name: 'API requests',
      consumed: 0,
      limit: 15_000,
      available: true,
    },
    {
      metricId: 'webhook_deliveries',
      name: 'Webhook deliveries',
      consumed: 0,
      limit: 1_000,
      available: true,
    },
    {
      metricId: 'storage_size',
      name: 'Storage size',
      consumed: 0,
      limit: 0.5,
      available: true,
      unit: 'GB',
    },
  ],
  pro: [
    {
      metricId: 'emails_sent',
      name: 'Emails sent',
      consumed: 0,
      limit: 50_000,
      available: true,
      unit: 'emails',
    },
    {
      metricId: 'api_requests',
      name: 'API requests',
      consumed: 0,
      limit: 250_000,
      available: true,
    },
    {
      metricId: 'webhook_deliveries',
      name: 'Webhook deliveries',
      consumed: 0,
      limit: 10_000,
      available: true,
    },
    {
      metricId: 'storage_size',
      name: 'Storage size',
      consumed: 0,
      limit: 2,
      available: true,
      unit: 'GB',
    },
  ],
  team: [
    {
      metricId: 'emails_sent',
      name: 'Emails sent',
      consumed: 0,
      limit: 100_000,
      available: true,
      unit: 'emails',
    },
    {
      metricId: 'api_requests',
      name: 'API requests',
      consumed: 0,
      limit: 1_000_000,
      available: true,
    },
    {
      metricId: 'webhook_deliveries',
      name: 'Webhook deliveries',
      consumed: 0,
      limit: 50_000,
      available: true,
    },
    {
      metricId: 'storage_size',
      name: 'Storage size',
      consumed: 0,
      limit: 10,
      available: true,
      unit: 'GB',
    },
  ],
};

/** Seed consumed values per workspace (plan caps applied separately). */
const SEED_METER_CONSUMED: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  [PARCEL_ID]: {
    emails_sent: 8,
    api_requests: 89_000,
    webhook_deliveries: 1_200,
    storage_size: 0.45,
  },
  [NOVA_ID]: {
    emails_sent: 1,
    api_requests: 12_000,
    webhook_deliveries: 45,
    storage_size: 0.08,
  },
  [LUMEN_ID]: {
    emails_sent: 0,
    api_requests: 42,
    webhook_deliveries: 12,
    storage_size: 0.02,
  },
};

function capConsumed(consumed: number, limit: number | null): number {
  if (limit === null) {
    return Math.max(0, consumed);
  }
  return Math.min(Math.max(0, consumed), limit);
}

/** Apply plan caps; preserve consumed from current meters or org seed. */
export function mergeMetersForPlan(
  planId: CommercialPlanId,
  currentMeters: readonly UsageMeter[],
  organizationId?: string,
): UsageMeter[] {
  const templates = PLAN_METER_TEMPLATES[planId];
  const seed = organizationId ? SEED_METER_CONSUMED[organizationId] : undefined;

  const useSeed = currentMeters.length === 0;

  return templates.map((template) => {
    const current = currentMeters.find((m) => m.metricId === template.metricId);
    const raw = current
      ? current.consumed
      : useSeed
        ? (seed?.[template.metricId] ?? template.consumed)
        : template.consumed;
    return {
      ...template,
      consumed: capConsumed(raw, template.limit),
      dailyConsumed:
        template.dailyLimit != null
          ? capConsumed(
              current?.dailyConsumed ?? template.dailyConsumed ?? 0,
              template.dailyLimit,
            )
          : template.dailyConsumed,
    };
  });
}

export function metersForOrganization(
  organizationId: string,
  planId: CommercialPlanId,
): readonly UsageMeter[] {
  return mergeMetersForPlan(planId, [], organizationId);
}

export function alignBillingSummaryMeters(
  summary: BillingSummary,
): BillingSummary {
  const planId = resolveCurrentPlanId(summary);
  return {
    ...summary,
    meters: mergeMetersForPlan(
      planId,
      summary.meters,
      summary.organizationId,
    ),
  };
}

export function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const MOCK_BILLING_SUMMARIES: Readonly<Record<string, BillingSummary>> = {
  [PARCEL_ID]: {
    organizationId: PARCEL_ID,
    planId: 'team',
    planName: 'Team',
    status: 'active',
    currentPeriodEnd: addDaysIso(28),
    cancelAtPeriodEnd: false,
    seatsUsed: 4,
    seatsLimit: 50,
    meters: metersForOrganization(PARCEL_ID, 'team'),
    trialEnd: null,
  },
  [NOVA_ID]: {
    organizationId: NOVA_ID,
    planId: 'pro',
    planName: 'Pro',
    status: 'trialing',
    currentPeriodEnd: addDaysIso(14),
    cancelAtPeriodEnd: false,
    seatsUsed: 2,
    seatsLimit: 10,
    meters: metersForOrganization(NOVA_ID, 'pro'),
    trialEnd: addDaysIso(5),
  },
  [LUMEN_ID]: {
    organizationId: LUMEN_ID,
    planId: null,
    planName: 'Free',
    status: 'none',
    currentPeriodEnd: addDaysIso(30),
    cancelAtPeriodEnd: false,
    seatsUsed: 3,
    seatsLimit: 3,
    meters: metersForOrganization(LUMEN_ID, 'free'),
    trialEnd: null,
  },
};

export const MOCK_BILLING_PLANS: readonly BillingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For personal projects and experiments.',
    priceAmount: 0,
    priceCurrency: 'USD',
    interval: 'month',
    features: [
      { id: 'seats', name: 'Up to 3 seats', included: true, limit: 3 },
      {
        id: 'emails',
        name: '3,000 emails / month (100 / day)',
        included: true,
        limit: 3_000,
      },
      { id: 'metrics', name: 'Basic metrics', included: true },
      { id: 'api_keys', name: 'Sending-only API keys', included: true },
    ],
    isPerSeat: false,
    isUsageBased: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For small teams shipping to production.',
    priceAmount: 25,
    priceCurrency: 'USD',
    interval: 'month',
    features: [
      { id: 'seats', name: 'Up to 10 seats', included: true, limit: 10 },
      {
        id: 'emails',
        name: '50,000 emails / month',
        included: true,
        limit: 50_000,
      },
      { id: 'metrics', name: 'Advanced metrics & filters', included: true },
      { id: 'api_keys', name: 'Full-access API keys', included: true },
      { id: 'support', name: 'Email support', included: true },
    ],
    isPerSeat: false,
    isUsageBased: false,
  },
  {
    id: 'team',
    name: 'Team',
    description: 'For organizations that need SSO and scale.',
    priceAmount: 49,
    priceCurrency: 'USD',
    interval: 'month',
    features: [
      { id: 'seats', name: 'Up to 50 seats', included: true, limit: 50 },
      {
        id: 'emails',
        name: '100,000 emails / month',
        included: true,
        limit: 100_000,
      },
      { id: 'sso', name: 'Single Sign-On (SSO)', included: true },
      { id: 'api_keys', name: 'Full-access API keys', included: true },
      { id: 'support', name: 'Priority support', included: true },
      { id: 'audit', name: 'Audit logs', included: true },
    ],
    isPerSeat: true,
    isUsageBased: false,
  },
];

const MOCK_INVOICES_BY_ORG: Readonly<Record<string, readonly Invoice[]>> = {
  [PARCEL_ID]: [
    {
      id: 'inv_parcel_1',
      number: 'PARCEL-1001',
      amountDue: 4900,
      amountPaid: 4900,
      currency: 'USD',
      status: 'paid',
      created: addDaysIso(-30),
      hostedInvoiceUrl: 'https://oequ.io/invoices/parcel-1001',
      invoicePdf: 'https://oequ.io/invoices/parcel-1001.pdf',
    },
    {
      id: 'inv_parcel_2',
      number: 'PARCEL-1002',
      amountDue: 4900,
      amountPaid: 4900,
      currency: 'USD',
      status: 'paid',
      created: addDaysIso(-60),
      hostedInvoiceUrl: 'https://oequ.io/invoices/parcel-1002',
      invoicePdf: 'https://oequ.io/invoices/parcel-1002.pdf',
    },
  ],
  [NOVA_ID]: [
    {
      id: 'inv_nova_1',
      number: 'NOVA-2001',
      amountDue: 0,
      amountPaid: 0,
      currency: 'USD',
      status: 'paid',
      created: addDaysIso(-7),
      hostedInvoiceUrl: 'https://oequ.io/invoices/nova-2001',
      invoicePdf: 'https://oequ.io/invoices/nova-2001.pdf',
    },
  ],
};

export function mockBillingSummaryForOrg(
  organizationId: string,
): BillingSummary {
  return (
    MOCK_BILLING_SUMMARIES[organizationId] ?? {
      organizationId,
      planId: null,
      planName: 'Free',
      status: 'none',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      seatsUsed: 1,
      seatsLimit: 3,
      meters: metersForOrganization(organizationId, 'free'),
      trialEnd: null,
    }
  );
}

export function mockInvoicesForOrg(organizationId: string): InvoiceListPage {
  return {
    items: MOCK_INVOICES_BY_ORG[organizationId] ?? [],
    nextCursor: null,
  };
}

const MOCK_PAYMENT_METHODS_BY_ORG: Readonly<
  Record<string, readonly PaymentMethod[]>
> = {
  [PARCEL_ID]: [
    {
      id: 'pm_parcel_default',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2028,
      isDefault: true,
    },
  ],
  [NOVA_ID]: [
    {
      id: 'pm_nova_default',
      brand: 'mastercard',
      last4: '4444',
      expMonth: 8,
      expYear: 2027,
      isDefault: true,
    },
  ],
};

export function mockPaymentMethodsForOrg(
  organizationId: string,
): readonly PaymentMethod[] {
  const seeded = MOCK_PAYMENT_METHODS_BY_ORG[organizationId] ?? [];
  return seeded.map((method) => ({ ...method }));
}

export const MOCK_BILLING_LATENCY_MS = 900;
