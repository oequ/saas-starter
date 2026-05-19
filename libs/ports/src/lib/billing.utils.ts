import type { BillingSummary, SubscriptionStatus } from './models/billing.model';

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

export type BillingBannerTone = 'info' | 'warning' | 'critical';

export interface BillingStatusBanner {
  readonly tone: BillingBannerTone;
  readonly message: string;
  readonly ctaLabel: string;
  readonly ctaPath: string;
}

const BILLING_SETTINGS_PATH = '/workspace/settings/billing/overview';

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
