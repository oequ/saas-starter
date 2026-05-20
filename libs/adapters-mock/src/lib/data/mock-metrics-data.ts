import type {
  MetricsDashboard,
  MetricsFilters,
  MetricsTimeSeries,
  OrganizationId,
  OutboundEmail,
  TimeSeriesPoint,
} from '@oequ/ports';

import {
  buildMetricsDateLabels,
  countEmailsOnDay,
  deliverabilityPercent,
  emailsInPreviousMetricsPeriod,
  emailsForMetricsPeriod,
  filterEmailsForMetrics,
  isBillableOutboundEmail,
  outboundEmailDomain,
  percentChange,
  statusRatePercent,
  uniqueOutboundDomains,
} from '../email-usage-stats';

function periodDays(period: MetricsFilters['period']): number {
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

function buildCountSeries(
  emails: readonly OutboundEmail[],
  labels: readonly string[],
): MetricsTimeSeries {
  const points: TimeSeriesPoint[] = labels.map((date) => ({
    date,
    value: countEmailsOnDay(emails, date),
  }));
  return { points };
}

function buildDailyRateSeries(
  emails: readonly OutboundEmail[],
  labels: readonly string[],
  status: OutboundEmail['status'],
): MetricsTimeSeries {
  const points: TimeSeriesPoint[] = labels.map((date) => {
    const { start, end } = (() => {
      const s = new Date(date);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(e.getDate() + 1);
      return { start: s.getTime(), end: e.getTime() };
    })();
    const dayEmails = emails.filter((email) => {
      const t = new Date(email.sentAt).getTime();
      return t >= start && t < end;
    });
    return {
      date,
      value: statusRatePercent(dayEmails, status),
    };
  });
  return { points };
}

export function buildMockMetricsDashboard(
  _organizationId: OrganizationId,
  filters: MetricsFilters,
  outboundEmails: readonly OutboundEmail[],
): MetricsDashboard {
  const days = periodDays(filters.period);
  const labels = buildMetricsDateLabels(days);
  const inPeriod = filterEmailsForMetrics(outboundEmails, filters);
  const previousPeriod = emailsInPreviousMetricsPeriod(
    outboundEmails,
    filters.period,
  );

  const emailsSent = inPeriod.length;
  const prevSent = previousPeriod.length;
  const bounced = inPeriod.filter((e) => e.status === 'bounced').length;
  const failed = inPeriod.filter((e) => e.status === 'failed').length;

  const deliverabilityRate = deliverabilityPercent(inPeriod);
  const bounceRate = statusRatePercent(inPeriod, 'bounced');
  const complainRate = statusRatePercent(inPeriod, 'failed');

  const prevDeliverability = deliverabilityPercent(previousPeriod);
  const prevBounce = statusRatePercent(previousPeriod, 'bounced');
  const prevComplain = statusRatePercent(previousPeriod, 'failed');

  const domains = uniqueOutboundDomains(
    emailsForMetricsPeriod(outboundEmails, filters.period),
  );

  const domainBreakdown = domains.map((domain) => {
    const domainEmails = inPeriod.filter(
      (email) => outboundEmailDomain(email) === domain,
    );
    return {
      domain,
      count: domainEmails.length,
      deliverabilityRate: deliverabilityPercent(domainEmails),
    };
  });

  return {
    domains: [
      { id: 'all', label: 'All domains' },
      ...domains.map((domain) => ({ id: domain, label: domain })),
    ],
    summary: {
      emailsSent,
      deliverabilityRate,
    },
    comparison: {
      emailsSentPercent: percentChange(emailsSent, prevSent),
      deliverabilityRatePoints:
        Math.round((deliverabilityRate - prevDeliverability) * 10) / 10,
      bounceRatePoints: Math.round((bounceRate - prevBounce) * 10) / 10,
      complainRatePoints: Math.round((complainRate - prevComplain) * 10) / 10,
    },
    emailsSeries: buildCountSeries(inPeriod, labels),
    domainBreakdown,
    bounce: {
      rate: bounceRate,
      series: buildDailyRateSeries(inPeriod, labels, 'bounced'),
      breakdown: [
        {
          kind: 'transient',
          count: bounced,
          rate: bounceRate,
        },
        {
          kind: 'permanent',
          count: 0,
          rate: 0,
        },
        {
          kind: 'undetermined',
          count: 0,
          rate: 0,
        },
      ],
      riskThresholdPercent: 4,
    },
    complain: {
      rate: complainRate,
      series: buildDailyRateSeries(inPeriod, labels, 'failed'),
      complainedCount: failed,
      riskThresholdPercent: 0.08,
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
