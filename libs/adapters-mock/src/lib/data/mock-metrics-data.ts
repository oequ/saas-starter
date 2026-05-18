import type {
  MetricsDashboard,
  MetricsFilters,
  MetricsTimeSeries,
  TimeSeriesPoint,
} from '@oequ/ports';

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function buildDateLabels(periodDays: number): string[] {
  const labels: string[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    labels.push(daysAgoIso(i));
  }
  return labels;
}

function buildEmailSeries(periodDays: number): MetricsTimeSeries {
  const labels = buildDateLabels(periodDays);
  const points: TimeSeriesPoint[] = labels.map((date, index) => {
    const progress = index / Math.max(labels.length - 1, 1);
    let value = 0;
    if (progress > 0.55) {
      value = Math.round((progress - 0.55) * 80);
    }
    if (index === labels.length - 1) {
      value = 12;
    }
    if (index === labels.length - 2) {
      value = 9;
    }
    return { date, value };
  });
  return { points };
}

function buildZeroPercentSeries(periodDays: number): MetricsTimeSeries {
  const labels = buildDateLabels(periodDays);
  return {
    points: labels.map((date) => ({ date, value: 0 })),
  };
}

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

export function buildMockMetricsDashboard(
  filters: MetricsFilters,
): MetricsDashboard {
  const days = periodDays(filters.period);
  const emailsSeries = buildEmailSeries(days);
  const emailsSent = emailsSeries.points.reduce((sum, p) => sum + p.value, 0);
  const domainMultiplier = filters.domainId === 'all' ? 1 : 0.85;

  return {
    domains: [
      { id: 'all', label: 'All domains' },
      { id: 'parcel.io', label: 'parcel.io' },
    ],
    summary: {
      emailsSent: Math.round(emailsSent * domainMultiplier),
      deliverabilityRate: emailsSent > 0 ? 100 : 0,
    },
    emailsSeries,
    domainBreakdown: [
      {
        domain: 'parcel.io',
        count: Math.round(emailsSent * domainMultiplier),
        deliverabilityRate: emailsSent > 0 ? 100 : 0,
      },
    ],
    bounce: {
      rate: 0,
      series: buildZeroPercentSeries(days),
      breakdown: [
        { kind: 'transient', count: 0, rate: 0 },
        { kind: 'permanent', count: 0, rate: 0 },
        { kind: 'undetermined', count: 0, rate: 0 },
      ],
      riskThresholdPercent: 4,
    },
    complain: {
      rate: 0,
      series: buildZeroPercentSeries(days),
      complainedCount: 0,
      riskThresholdPercent: 0.08,
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
