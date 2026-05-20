import type { EmailListPeriod, OutboundEmailStatus } from './models/email.model';

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
    return '—';
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
