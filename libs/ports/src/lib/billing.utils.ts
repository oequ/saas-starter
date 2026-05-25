import type { BillingProviderId } from './billing-provider.model';
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

/** Max seats on Team (catalog + Postgres `seat_limit_for_plan` cap). */
export const TEAM_PLAN_MAX_SEATS = 50;

/** Team is billed per seat in Stripe; Pro is a flat monthly price (quantity 1). */
export function isPerSeatBillingPlan(planId: string): boolean {
  return planId.toLowerCase().trim() === 'team';
}

/**
 * Seat quantity for Stripe Checkout line item.
 * Team: current usage (min 1, max catalog cap). Pro: flat (1).
 */
export function checkoutBillableSeatCount(
  planId: string,
  seatsUsed: number,
  planSeatCap = TEAM_PLAN_MAX_SEATS,
): number {
  if (!isPerSeatBillingPlan(planId)) {
    return 1;
  }
  const used = Number.isFinite(seatsUsed) ? Math.floor(seatsUsed) : 1;
  const cap = Number.isFinite(planSeatCap) ? Math.floor(planSeatCap) : TEAM_PLAN_MAX_SEATS;
  return Math.min(Math.max(1, used), Math.max(1, cap));
}

/** Postgres `seats_limit` from Stripe subscription item quantity (Team only). */
export function seatsLimitFromStripeQuantity(
  planId: string,
  quantity: number,
  planSeatCap = TEAM_PLAN_MAX_SEATS,
): number | null {
  if (!isPerSeatBillingPlan(planId)) {
    return null;
  }
  const qty = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  const cap = Number.isFinite(planSeatCap) ? Math.floor(planSeatCap) : TEAM_PLAN_MAX_SEATS;
  return Math.min(Math.max(1, qty), Math.max(1, cap));
}

/** True when invite needs a Stripe quantity bump before `invite_organization_member`. */
export function needsStripeSeatBumpBeforeInvite(
  summary: BillingSummary,
  providerId: BillingProviderId,
): boolean {
  if (providerId !== 'stripe') {
    return false;
  }
  const planId = resolveCurrentPlanId(summary);
  if (!isPerSeatBillingPlan(planId)) {
    return false;
  }
  if (summary.seatsLimit === null) {
    return false;
  }
  return summary.seatsUsed >= summary.seatsLimit;
}

/** Target Stripe quantity when adding one seat via invite (Team). */
export function targetSeatQuantityForInvite(summary: BillingSummary): number {
  const planId = resolveCurrentPlanId(summary);
  return checkoutBillableSeatCount(
    planId,
    summary.seatsUsed + 1,
    TEAM_PLAN_MAX_SEATS,
  );
}

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
): PlanDowngradeSeatsBlocker | null {
  const newLimit = seatLimitForPlanId(targetPlanId, plans);
  if (newLimit === null) {
    return null;
  }
  if (summary.seatsUsed <= newLimit) {
    return null;
  }
  return {
    seatsUsed: summary.seatsUsed,
    seatLimit: newLimit,
    targetPlanId,
  };
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
  readonly messageKey: string;
  readonly messageParams?: Record<string, string | number>;
  readonly ctaLabelKey: string;
  readonly ctaPath: string;
}

/** Seat cap blocks downgrade until members are removed. */
export interface PlanDowngradeSeatsBlocker {
  readonly seatsUsed: number;
  readonly seatLimit: number;
  readonly targetPlanId: string;
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
      const messageKey =
        days === null
          ? 'paywall.banner.trialing.messageNoEnd'
          : days === 1
            ? 'paywall.banner.trialing.messageOneDay'
            : 'paywall.banner.trialing.messageDays';
      return {
        tone: 'info',
        messageKey,
        messageParams: days !== null ? { days } : undefined,
        ctaLabelKey: 'paywall.banner.trialing.cta',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    }
    case 'past_due':
      return {
        tone: 'critical',
        messageKey: 'paywall.banner.past_due.message',
        ctaLabelKey: 'paywall.banner.past_due.cta',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    case 'incomplete':
      return {
        tone: 'critical',
        messageKey: 'paywall.banner.incomplete.message',
        ctaLabelKey: 'paywall.banner.incomplete.cta',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    case 'unpaid':
      return {
        tone: 'critical',
        messageKey: 'paywall.banner.unpaid.message',
        ctaLabelKey: 'paywall.banner.unpaid.cta',
        ctaPath: BILLING_SETTINGS_PATH,
      };
    case 'canceled':
      return {
        tone: 'warning',
        messageKey: summary.cancelAtPeriodEnd
          ? 'paywall.banner.canceled.messageEnd'
          : 'paywall.banner.canceled.messageEnded',
        messageParams: summary.cancelAtPeriodEnd
          ? { date: formatShortDate(summary.currentPeriodEnd) }
          : undefined,
        ctaLabelKey: 'paywall.banner.canceled.cta',
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

export interface MockPaymentMethodValidationError {
  readonly reason: string;
  readonly params?: Record<string, unknown>;
}

/** Demo validation aligned with Stripe test cards (4242…). Returns i18n reason keys. */
export function validateMockPaymentMethodInput(
  input: AddPaymentMethodInput,
): MockPaymentMethodValidationError | null {
  const name = input.cardholderName.trim();
  if (!name) {
    return { reason: 'paymentCardholderRequired' };
  }

  const digits = normalizeCardNumber(input.number);
  if (digits.length < 13 || digits.length > 19) {
    return { reason: 'paymentCardNumberInvalid' };
  }
  if (!digits.startsWith('4242') && !digits.startsWith('5555')) {
    return { reason: 'paymentTestCardRequired' };
  }

  if (input.expMonth < 1 || input.expMonth > 12) {
    return { reason: 'paymentExpiryInvalid' };
  }

  const now = new Date();
  const expiryEnd = new Date(input.expYear, input.expMonth, 0, 23, 59, 59);
  if (expiryEnd < now) {
    return { reason: 'paymentCardExpired' };
  }

  const cvc = input.cvc.replace(/\D/g, '');
  const brand = detectCardBrandFromNumber(digits);
  const cvcLength = brand === 'amex' ? 4 : 3;
  if (cvc.length !== cvcLength) {
    return {
      reason: 'paymentCvcInvalid',
      params: { digits: cvcLength },
    };
  }

  return null;
}
