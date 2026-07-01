import type {
  EmailListPeriod,
  OutboundEmailStatus,
  RetrospectiveSendPeriod,
  SimulateOutboundEmailRecord,
} from './models/email.model';
import type { MetricsPeriod } from './models/metrics.model';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatOutboundEmailStatus(status: OutboundEmailStatus): string {
  switch (status) {
    case 'delivered':
      return 'Delivered';
    case 'bounced':
      return 'Bounced';
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

export function emailStatusBadgeClass(status: OutboundEmailStatus): string {
  switch (status) {
    case 'delivered':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    case 'bounced':
    case 'failed':
      return 'border-destructive/25 bg-destructive/10 text-destructive';
    case 'queued':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400';
    default:
      return '';
  }
}

export function emailListPeriodLabel(period: EmailListPeriod): string {
  switch (period) {
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
    default:
      return 'Last 15 days';
  }
}

export function formatEmailSentRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return 'вЂ”';
  }
  const diffMs = then - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  if (absSec < 60) {
    return relativeTime.format(Math.round(diffMs / 1000), 'second');
  }
  if (absSec < 3600) {
    return relativeTime.format(Math.round(diffMs / 60_000), 'minute');
  }
  if (absSec < 86_400) {
    return relativeTime.format(Math.round(diffMs / 3_600_000), 'hour');
  }
  return relativeTime.format(Math.round(diffMs / 86_400_000), 'day');
}

export function emailPeriodCutoffIso(period: EmailListPeriod): string {
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 15;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function retrospectiveSendPeriodLabel(
  period: RetrospectiveSendPeriod,
): string {
  switch (period) {
    case 'today':
      return 'Today';
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
  }
}

export function retrospectivePeriodToMetricsPeriod(
  period: RetrospectiveSendPeriod,
): MetricsPeriod {
  return period === '30d' ? '30d' : '15d';
}

function retrospectiveWindowMs(
  period: RetrospectiveSendPeriod,
  now: Date = new Date(),
): { readonly startMs: number; readonly endMs: number } {
  const endMs = now.getTime();
  if (period === 'today') {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return { startMs: start.getTime(), endMs };
  }
  const days = period === '30d' ? 30 : 7;
  return { startMs: endMs - days * 86_400_000, endMs };
}

function retrospectiveStatusForIndex(
  index: number,
  total: number,
): OutboundEmailStatus {
  if (total <= 0) {
    return 'delivered';
  }
  const bouncedCutoff = Math.floor(total * 0.03);
  const failedCutoff = bouncedCutoff + Math.floor(total * 0.01);
  if (index < bouncedCutoff) {
    return 'bounced';
  }
  if (index < failedCutoff) {
    return 'failed';
  }
  return 'delivered';
}

/** Spread sends across a retrospective window (demo metrics animation). */
export function formatEmailListPaginationRange(
  pageIndex: number,
  pageSize: number,
  total: number,
): string {
  if (total <= 0) {
    return '0 emails';
  }
  const start = pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, total);
  return `${start}вЂ“${end} of ${total.toLocaleString()} emails`;
}

export function buildRetrospectiveEmailRecords(
  count: number,
  period: RetrospectiveSendPeriod,
  now: Date = new Date(),
): readonly SimulateOutboundEmailRecord[] {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount === 0) {
    return [];
  }

  const { startMs, endMs } = retrospectiveWindowMs(period, now);
  const span = Math.max(endMs - startMs, 1);

  return Array.from({ length: safeCount }, (_, index) => {
    const t =
      safeCount === 1
        ? endMs
        : startMs + (span * index) / (safeCount - 1);
    return {
      sentAt: new Date(t).toISOString(),
      status: retrospectiveStatusForIndex(index, safeCount),
      subject: 'Simulated campaign',
      to: `user${(index % 97) + 1}@oequ.io`,
    };
  });
}
