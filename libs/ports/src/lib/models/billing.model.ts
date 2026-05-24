import type { OrganizationId } from './org.model';

export type SubscriptionInterval = 'month' | 'year' | 'one_time';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'paused'
  | 'none';

export interface PlanFeature {
  readonly id: string;
  readonly name: string;
  readonly included: boolean;
  readonly limit?: number;
}

export interface BillingPlan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priceAmount: number;
  readonly priceCurrency: string;
  readonly interval: SubscriptionInterval;
  readonly features: readonly PlanFeature[];
  readonly isPerSeat: boolean;
  readonly isUsageBased: boolean;
}

export interface UsageMeter {
  readonly metricId: string;
  readonly name: string;
  readonly consumed: number;
  readonly limit: number | null;
  readonly available: boolean;
  readonly unit?: string;
  /** Optional daily cap (e.g. Resend Free: 100 emails / day). */
  readonly dailyLimit?: number | null;
  readonly dailyConsumed?: number;
}

export interface BillingSummary {
  readonly organizationId: OrganizationId;
  readonly planId: string | null;
  readonly planName: string;
  readonly status: SubscriptionStatus;
  readonly currentPeriodEnd: string | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly seatsUsed: number;
  readonly seatsLimit: number | null;
  readonly meters: readonly UsageMeter[];
  readonly trialEnd: string | null;
}

export type InvoiceStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'uncollectible'
  | 'void';

export interface Invoice {
  readonly id: string;
  readonly number: string;
  readonly amountDue: number;
  readonly amountPaid: number;
  readonly currency: string;
  readonly status: InvoiceStatus;
  readonly created: string;
  readonly hostedInvoiceUrl: string;
  readonly invoicePdf: string;
}

export interface InvoiceListPage {
  readonly items: readonly Invoice[];
  readonly nextCursor: string | null;
}

export interface CheckoutSession {
  /** Mock checkout (demo / local without Stripe). */
  readonly clientSecret?: string;
  /** Hosted Stripe Checkout URL (Supabase Edge Functions). */
  readonly url?: string;
}

export interface PortalSession {
  readonly url: string;
}

export type PaymentMethodBrand = 'visa' | 'mastercard' | 'amex' | 'unknown';

export interface PaymentMethod {
  readonly id: string;
  readonly brand: PaymentMethodBrand;
  readonly last4: string;
  readonly expMonth: number;
  readonly expYear: number;
  readonly isDefault: boolean;
}

/** Demo / mock card capture. Production: Stripe Elements + SetupIntent.confirm. */
export interface AddPaymentMethodInput {
  readonly cardholderName: string;
  readonly number: string;
  readonly expMonth: number;
  readonly expYear: number;
  readonly cvc: string;
}
