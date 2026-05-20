import type {
  CommercialPlanId,
  EmailListPeriod,
  MetricsFilters,
  MetricsPeriod,
  OutboundEmail,
} from '@oequ/ports';
import { emailPeriodCutoffIso } from '@oequ/ports';

export interface EmailPlanQuota {
  readonly monthlyLimit: number | null;
  readonly dailyLimit: number | null;
}

/** Resend-aligned transactional email caps (demo). */
export const EMAIL_QUOTA_BY_PLAN: Readonly<
  Record<CommercialPlanId, EmailPlanQuota>
> = {
  free: { monthlyLimit: 3_000, dailyLimit: 100 },
  pro: { monthlyLimit: 50_000, dailyLimit: null },
  team: { monthlyLimit: 100_000, dailyLimit: null },
};

export function emailQuotaForPlan(planId: CommercialPlanId): EmailPlanQuota {
  return EMAIL_QUOTA_BY_PLAN[planId];
}

/** Counts toward plan usage and outbound volume (excludes still-queued). */
export function isBillableOutboundEmail(email: OutboundEmail): boolean {
  return email.status !== 'queued';
}

export function outboundEmailDomain(email: OutboundEmail): string {
  const at = email.to.lastIndexOf('@');
  return at >= 0 ? email.to.slice(at + 1).toLowerCase() : 'unknown';
}

export function billableOutboundCount(emails: readonly OutboundEmail[]): number {
  return emails.filter(isBillableOutboundEmail).length;
}

function utcDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

/** Billable sends on the current UTC calendar day. */
export function countBillableEmailsToday(
  emails: readonly OutboundEmail[],
  now: Date = new Date(),
): number {
  const today = utcDayKey(now.toISOString());
  return emails.filter(
    (email) =>
      isBillableOutboundEmail(email) && utcDayKey(email.sentAt) === today,
  ).length;
}

export function emailsSinceCutoff(
  emails: readonly OutboundEmail[],
  cutoffIso: string,
): readonly OutboundEmail[] {
  return emails.filter(
    (email) => isBillableOutboundEmail(email) && email.sentAt >= cutoffIso,
  );
}

export function emailsForMetricsPeriod(
  emails: readonly OutboundEmail[],
  period: MetricsPeriod | EmailListPeriod,
): readonly OutboundEmail[] {
  return emailsSinceCutoff(emails, emailPeriodCutoffIso(period));
}

function periodDays(period: MetricsPeriod): number {
  switch (period) {
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '15d':
    default:
      return 15;
  }
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function buildMetricsDateLabels(periodDaysCount: number): string[] {
  const labels: string[] = [];
  for (let i = periodDaysCount - 1; i >= 0; i--) {
    labels.push(daysAgoIso(i));
  }
  return labels;
}

function dayBoundsFromLabel(dateLabel: string): { start: number; end: number } {
  const start = new Date(dateLabel);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export function countEmailsOnDay(
  emails: readonly OutboundEmail[],
  dateLabel: string,
): number {
  const { start, end } = dayBoundsFromLabel(dateLabel);
  return emails.filter((email) => {
    const t = new Date(email.sentAt).getTime();
    return t >= start && t < end;
  }).length;
}

export function filterEmailsForMetrics(
  emails: readonly OutboundEmail[],
  filters: MetricsFilters,
): readonly OutboundEmail[] {
  let scoped = emailsForMetricsPeriod(emails, filters.period);
  if (filters.domainId !== 'all') {
    scoped = scoped.filter(
      (email) => outboundEmailDomain(email) === filters.domainId,
    );
  }
  return scoped;
}

export function previousPeriodCutoffIso(period: MetricsPeriod): string {
  const days = periodDays(period);
  const date = new Date();
  date.setDate(date.getDate() - days * 2);
  return date.toISOString();
}

export function emailsInPreviousMetricsPeriod(
  emails: readonly OutboundEmail[],
  period: MetricsPeriod,
): readonly OutboundEmail[] {
  const currentCutoff = emailPeriodCutoffIso(period);
  const previousCutoff = previousPeriodCutoffIso(period);
  return emails.filter(
    (email) =>
      isBillableOutboundEmail(email) &&
      email.sentAt >= previousCutoff &&
      email.sentAt < currentCutoff,
  );
}

export function percentChange(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function deliverabilityPercent(
  emails: readonly OutboundEmail[],
): number {
  if (emails.length === 0) {
    return 0;
  }
  const delivered = emails.filter((e) => e.status === 'delivered').length;
  return Math.round((delivered / emails.length) * 1000) / 10;
}

export function statusRatePercent(
  emails: readonly OutboundEmail[],
  status: OutboundEmail['status'],
): number {
  if (emails.length === 0) {
    return 0;
  }
  const count = emails.filter((e) => e.status === status).length;
  return Math.round((count / emails.length) * 1000) / 10;
}

export function uniqueOutboundDomains(
  emails: readonly OutboundEmail[],
): readonly string[] {
  const domains = new Set<string>();
  for (const email of emails) {
    if (isBillableOutboundEmail(email)) {
      domains.add(outboundEmailDomain(email));
    }
  }
  return [...domains].sort();
}
