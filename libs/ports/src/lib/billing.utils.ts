import type {
  AddPaymentMethodInput,
  BillingPlan,
  BillingSummary,
  PaymentMethodBrand,
  SubscriptionStatus,
  UsageMeter,
} from './models/billing.model';
import type { OrganizationMember } from './models/org.model';

export type CommercialPlanId = 'free' | 'pro' | 'team';

export const COMMERCIAL_PLAN_IDS: readonly CommercialPlanId[] = [
  'free',
  'pro',
  'team',
];

const LEGACY_PLAN_ID_MAP: Readonly<Record<string, CommercialPlanId>> = {
  starter: 'pro',
  professional: 'team',
};

export function resolveCurrentPlanId(summary: BillingSummary): CommercialPlanId {
  if (!summary.planId || summary.planId === 'free') {
    return 'free';
  }
  const mapped = LEGACY_PLAN_ID_MAP[summary.planId];
  if (mapped) {
    return mapped;
  }
  if (summary.planId === 'pro' || summary.planId === 'team') {
    return summary.planId;
  }
  return 'free';
}

export function comparePlanTiers(
  a: CommercialPlanId,
  b: CommercialPlanId,
): number {
  return COMMERCIAL_PLAN_IDS.indexOf(a) - COMMERCIAL_PLAN_IDS.indexOf(b);
}

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'same';

export function getPlanChangeDirection(
  currentPlanId: CommercialPlanId,
  targetPlanId: CommercialPlanId,
): PlanChangeDirection {
  const comparison = comparePlanTiers(targetPlanId, currentPlanId);
  if (comparison > 0) {
    return 'upgrade';
  }
  if (comparison < 0) {
    return 'downgrade';
  }
  return 'same';
}

/** Human-readable blocker when seatsUsed exceeds the target plan seat cap. */
export function getDowngradeBlocker(
  summary: BillingSummary,
  targetPlanId: string,
  plans?: readonly BillingPlan[],
): string | null {
  const newLimit = seatLimitForPlanId(targetPlanId, plans);
  if (newLimit === null) {
    return null;
  }
  if (summary.seatsUsed <= newLimit) {
    return null;
  }
  const planLabel =
    plans?.find((plan) => plan.id === targetPlanId)?.name ?? targetPlanId;
  return `You have ${formatUsageNumber(summary.seatsUsed)} members but ${planLabel} allows ${formatUsageNumber(newLimit)}. Remove members before downgrading.`;
}

const DEFAULT_SEAT_LIMIT_BY_PLAN: Readonly<Record<string, number>> = {
  free: 3,
  pro: 10,
  team: 50,
  starter: 10,
  professional: 50,
};

/** Seat cap from catalog features, then known plan ids (incl. legacy aliases). */
export function seatLimitForPlanId(
  planId: string | null | undefined,
  plans?: readonly BillingPlan[],
): number | null {
  if (!planId || planId === 'free') {
    return DEFAULT_SEAT_LIMIT_BY_PLAN['free'] ?? 3;
  }

  const catalogLimit = plans
    ?.find((plan) => plan.id === planId)
    ?.features.find((feature) => feature.id === 'seats')?.limit;
  if (catalogLimit !== undefined && catalogLimit !== null) {
    return catalogLimit;
  }

  if (planId in DEFAULT_SEAT_LIMIT_BY_PLAN) {
    return DEFAULT_SEAT_LIMIT_BY_PLAN[planId];
  }

  const legacy = LEGACY_PLAN_ID_MAP[planId];
  if (legacy && legacy in DEFAULT_SEAT_LIMIT_BY_PLAN) {
    return DEFAULT_SEAT_LIMIT_BY_PLAN[legacy];
  }

  return null;
}

/** Keeps `seatsLimit` consistent with `planId` (avoids stale caps after upgrades). */
export function alignBillingSummarySeats(
  summary: BillingSummary,
  plans?: readonly BillingPlan[],
): BillingSummary {
  return {
    ...summary,
    seatsLimit: seatLimitForPlanId(summary.planId, plans),
  };
}

export function countMembersTowardSeats(
  members: readonly Pick<OrganizationMember, 'status'>[],
): number {
  return members.filter(
    (member) => member.status === 'active' || member.status === 'invited',
  ).length;
}

export function isBillingSeatsExhausted(summary: BillingSummary): boolean {
  return (
    summary.seatsLimit !== null && summary.seatsUsed >= summary.seatsLimit
  );
}

export function billingSeatUsagePercent(summary: BillingSummary): number | null {
  if (summary.seatsLimit === null || summary.seatsLimit <= 0) {
    return null;
  }
  return Math.min(100, Math.round((summary.seatsUsed / summary.seatsLimit) * 100));
}

export function isBillingSeatUsageCritical(summary: BillingSummary): boolean {
  const percent = billingSeatUsagePercent(summary);
  return percent !== null && percent >= 90;
}

export function billingMeterUsagePercent(meter: UsageMeter): number | null {
  if (!meter.available) {
    return null;
  }

  const monthlyPercent =
    meter.limit !== null && meter.limit > 0
      ? Math.min(100, Math.round((meter.consumed / meter.limit) * 100))
      : null;

  const dailyPercent =
    meter.dailyLimit != null && meter.dailyLimit > 0
      ? Math.min(
          100,
          Math.round(((meter.dailyConsumed ?? 0) / meter.dailyLimit) * 100),
        )
      : null;

  if (monthlyPercent === null && dailyPercent === null) {
    return null;
  }
  if (monthlyPercent === null) {
    return dailyPercent;
  }
  if (dailyPercent === null) {
    return monthlyPercent;
  }
  return Math.max(monthlyPercent, dailyPercent);
}

export function formatUsageNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatUsageMeterValue(meter: UsageMeter): string {
  if (!meter.available) {
    return 'Unavailable in plan';
  }
  const consumed = formatUsageNumber(meter.consumed);
  if (meter.limit === null) {
    const base = `${consumed} / Unlimited${meter.unit ? ` ${meter.unit}` : ''}`;
    if (meter.dailyLimit != null) {
      return `${base} · ${formatUsageNumber(meter.dailyConsumed ?? 0)} / ${formatUsageNumber(meter.dailyLimit)} today`;
    }
    return base;
  }
  const limit = formatUsageNumber(meter.limit);
  const base = `${consumed} / ${limit}${meter.unit ? ` ${meter.unit}` : ''}`;
  if (meter.dailyLimit != null) {
    return `${base} · ${formatUsageNumber(meter.dailyConsumed ?? 0)} / ${formatUsageNumber(meter.dailyLimit)} today`;
  }
  return base;
}

export function billingPeriodLabel(summary: BillingSummary): string {
  const end = summary.currentPeriodEnd
    ? new Date(summary.currentPeriodEnd)
    : new Date();
  if (Number.isNaN(end.getTime())) {
    return 'Current billing cycle';
  }
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return `${formatShortDate(start.toISOString())} – ${formatShortDate(summary.currentPeriodEnd)}`;
}

export function formatSeatUsageValue(summary: BillingSummary): string {
  const limit =
    summary.seatsLimit === null ? 'Unlimited' : formatUsageNumber(summary.seatsLimit);
  return `${formatUsageNumber(summary.seatsUsed)} / ${limit}`;
}

function formatIncludedLimit(
  limit: number | null | undefined,
  unit?: string,
): string {
  if (limit === null || limit === undefined) {
    return unit ? `unlimited ${unit}` : 'unlimited usage';
  }
  const formatted = formatUsageNumber(limit);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function usageDetailTooltip(
  metricId: string,
  summary: BillingSummary,
  options: {
    readonly available?: boolean;
    readonly limit?: number | null;
    readonly unit?: string;
  } = {},
): string {
  const planName = formatPlanLabel(summary.planId, summary.planName);
  const available = options.available ?? true;

  if (!available) {
    switch (metricId) {
      case 'sso_users':
        return 'Team plan includes up to 100 monthly active SSO users. Upgrade to enable single sign-on for your organization.';
      case 'storage_image_transformations':
        return 'Team plan includes unlimited storage image transformations. Upgrade to optimize images on delivery.';
      default:
        return 'This feature is not included on your current plan. Upgrade to unlock it.';
    }
  }

  switch (metricId) {
    case 'seats':
      return `Your ${planName} plan includes up to ${formatIncludedLimit(summary.seatsLimit)} seats. Active and invited members count toward this limit.`;
    case 'emails_sent':
      if (resolveCurrentPlanId(summary) === 'free') {
        return `${planName} includes 3,000 emails per billing cycle and up to 100 emails per day (UTC) for transactional sends.`;
      }
      return `${planName} includes ${formatIncludedLimit(options.limit, options.unit ?? 'emails')} per billing cycle for transactional and marketing sends.`;
    case 'api_requests':
      return `${planName} includes ${formatIncludedLimit(options.limit, 'API requests')} per billing cycle across sending and management endpoints.`;
    case 'webhook_deliveries':
      return `${planName} includes ${formatIncludedLimit(options.limit, 'webhook deliveries')} per billing cycle for event notifications.`;
    case 'storage_size':
      return `${planName} includes ${formatIncludedLimit(options.limit, options.unit ?? 'GB')} of file and attachment storage.`;
    case 'sso_users':
      return `Team plan includes ${formatIncludedLimit(options.limit, options.unit ?? 'MAU')} for SSO-enabled sign-ins each billing cycle.`;
    case 'storage_image_transformations':
      return `Team plan includes ${formatIncludedLimit(options.limit, 'image transformations')} for on-the-fly image processing.`;
    default:
      return `${planName} includes ${formatIncludedLimit(options.limit, options.unit)} for this metric each billing cycle.`;
  }
}

export type BillingBannerTone = 'info' | 'warning' | 'critical';

export interface BillingStatusBanner {
  readonly tone: BillingBannerTone;
  readonly message: string;
  readonly ctaLabel: string;
  readonly ctaPath: string;
}

const BILLING_SETTINGS_PATH = '/workspace/settings/billing';

export const USAGE_SETTINGS_PATH = '/workspace/settings/usage';

export function billingStatusBanner(
  summary: BillingSummary | null | undefined,
): BillingStatusBanner | null {
  if (!summary) {
    return null;
  }

  switch (summary.status) {
    case 'trialing': {
      const days = daysUntil(summary.trialEnd);
      const suffix =
        days !== null
          ? ` Trial ends in ${days} day${days === 1 ? '' : 's'}.`
          : '';
      return {
        tone: 'info',
        message: `You are on a trial.${suffix} Add a payment method to avoid interruption.`,
        ctaLabel: 'Manage billing',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    }
    case 'past_due':
      return {
        tone: 'critical',
        message: 'Your last payment failed. Update billing details to restore full access.',
        ctaLabel: 'Update payment',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    case 'incomplete':
      return {
        tone: 'critical',
        message: 'Action required to activate your subscription.',
        ctaLabel: 'Complete checkout',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    case 'unpaid':
      return {
        tone: 'critical',
        message: 'This workspace is suspended due to unpaid invoices.',
        ctaLabel: 'Pay balance',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    case 'canceled':
      return {
        tone: 'warning',
        message: summary.cancelAtPeriodEnd
          ? `Your plan will end on ${formatShortDate(summary.currentPeriodEnd)}.`
          : 'Your subscription has ended. Reactivate to regain access.',
        ctaLabel: 'Renew plan',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    default:
      return null;
  }
}

export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  switch (status) {
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Past due';
    case 'none':
      return 'No subscription';
    case 'incomplete':
      return 'Incomplete';
    case 'unpaid':
      return 'Unpaid';
    case 'paused':
      return 'Paused';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function formatPlanLabel(planId: string | null, planName?: string): string {
  if (planName?.trim()) {
    return planName.trim();
  }
  if (!planId) {
    return 'Free';
  }
  return planId.replace(/-/g, ' ');
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) {
    return null;
  }
  const end = new Date(isoDate);
  if (Number.isNaN(end.getTime())) {
    return null;
  }
  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function formatShortDate(isoDate: string | null): string {
  if (!isoDate) {
    return 'the end of the billing period';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'the end of the billing period';
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatPaymentMethodBrand(brand: PaymentMethodBrand): string {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'American Express';
    default:
      return 'Card';
  }
}

export function formatPaymentMethodExpiry(
  expMonth: number,
  expYear: number,
): string {
  const month = String(expMonth).padStart(2, '0');
  const year = String(expYear).slice(-2);
  return `${month}/${year}`;
}

export function normalizeCardNumber(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function detectCardBrandFromNumber(number: string): PaymentMethodBrand {
  const digits = normalizeCardNumber(number);
  if (digits.startsWith('4')) {
    return 'visa';
  }
  if (/^5[1-5]/.test(digits) || digits.startsWith('2')) {
    return 'mastercard';
  }
  if (/^3[47]/.test(digits)) {
    return 'amex';
  }
  return 'unknown';
}

/** Parses MM/YY or MM/YYYY from a single expiry field. */
export function parseCardExpiryInput(
  raw: string,
): { expMonth: number; expYear: number } | null {
  const trimmed = raw.trim();
  const match = /^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const expMonth = Number.parseInt(match[1], 10);
  let expYear = Number.parseInt(match[2], 10);
  if (expYear < 100) {
    expYear += 2000;
  }
  if (expMonth < 1 || expMonth > 12) {
    return null;
  }
  return { expMonth, expYear };
}

/** Demo validation aligned with Stripe test cards (4242…). */
export function validateMockPaymentMethodInput(
  input: AddPaymentMethodInput,
): string | null {
  const name = input.cardholderName.trim();
  if (!name) {
    return 'Enter the name on the card.';
  }

  const digits = normalizeCardNumber(input.number);
  if (digits.length < 13 || digits.length > 19) {
    return 'Enter a valid card number.';
  }
  if (!digits.startsWith('4242') && !digits.startsWith('5555')) {
    return 'Use test card 4242 4242 4242 4242 or 5555 5555 5555 4444.';
  }

  if (input.expMonth < 1 || input.expMonth > 12) {
    return 'Enter a valid expiry date (MM/YY).';
  }

  const now = new Date();
  const expiryEnd = new Date(input.expYear, input.expMonth, 0, 23, 59, 59);
  if (expiryEnd < now) {
    return 'This card has expired.';
  }

  const cvc = input.cvc.replace(/\D/g, '');
  const brand = detectCardBrandFromNumber(digits);
  const cvcLength = brand === 'amex' ? 4 : 3;
  if (cvc.length !== cvcLength) {
    return `Enter a valid ${cvcLength}-digit security code.`;
  }

  return null;
}
