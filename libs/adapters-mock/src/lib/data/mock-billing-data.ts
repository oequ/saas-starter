import type {
  BillingPlan,
  BillingSummary,
  Invoice,
  InvoiceListPage,
} from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './mock-data';

const ACME_ID = MOCK_ORGANIZATIONS[0].id;
const GLOBEX_ID = MOCK_ORGANIZATIONS[1].id;

export function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const MOCK_BILLING_SUMMARIES: Readonly<Record<string, BillingSummary>> = {
  [ACME_ID]: {
    organizationId: ACME_ID,
    planId: 'professional',
    planName: 'Professional',
    status: 'active',
    currentPeriodEnd: addDaysIso(28),
    cancelAtPeriodEnd: false,
    seatsUsed: 5,
    seatsLimit: 5,
    meters: [],
    trialEnd: null,
  },
  [GLOBEX_ID]: {
    organizationId: GLOBEX_ID,
    planId: 'starter',
    planName: 'Starter',
    status: 'trialing',
    currentPeriodEnd: addDaysIso(14),
    cancelAtPeriodEnd: false,
    seatsUsed: 2,
    seatsLimit: 10,
    meters: [],
    trialEnd: addDaysIso(5),
  },
};

export const MOCK_BILLING_PLANS: readonly BillingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams getting started.',
    priceAmount: 29,
    priceCurrency: 'USD',
    interval: 'month',
    features: [
      { id: 'seats', name: 'Up to 10 seats', included: true, limit: 10 },
    ],
    isPerSeat: false,
    isUsageBased: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing teams that need more seats.',
    priceAmount: 49,
    priceCurrency: 'USD',
    interval: 'month',
    features: [
      { id: 'seats', name: 'Up to 50 seats', included: true, limit: 50 },
    ],
    isPerSeat: true,
    isUsageBased: false,
  },
];

const MOCK_INVOICES_BY_ORG: Readonly<Record<string, readonly Invoice[]>> = {
  [ACME_ID]: [
    {
      id: 'inv_acme_1',
      number: 'ACME-1001',
      amountDue: 4900,
      amountPaid: 4900,
      currency: 'USD',
      status: 'paid',
      created: addDaysIso(-30),
      hostedInvoiceUrl: 'https://example.com/invoices/acme-1001',
      invoicePdf: 'https://example.com/invoices/acme-1001.pdf',
    },
    {
      id: 'inv_acme_2',
      number: 'ACME-1002',
      amountDue: 4900,
      amountPaid: 4900,
      currency: 'USD',
      status: 'paid',
      created: addDaysIso(-60),
      hostedInvoiceUrl: 'https://example.com/invoices/acme-1002',
      invoicePdf: 'https://example.com/invoices/acme-1002.pdf',
    },
  ],
  [GLOBEX_ID]: [
    {
      id: 'inv_globex_1',
      number: 'GLOBEX-2001',
      amountDue: 0,
      amountPaid: 0,
      currency: 'USD',
      status: 'paid',
      created: addDaysIso(-7),
      hostedInvoiceUrl: 'https://example.com/invoices/globex-2001',
      invoicePdf: 'https://example.com/invoices/globex-2001.pdf',
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
      meters: [],
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

export const MOCK_BILLING_LATENCY_MS = 900;
