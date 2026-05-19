import type {
  MetricsDashboard,
  MetricsFilters,
  MetricsTimeSeries,
  OrganizationId,
  TimeSeriesPoint,
} from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './mock-data';

const PARCEL_ID = MOCK_ORGANIZATIONS[0].id;

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

function buildPercentSeries(
  periodDays: number,
  values: readonly number[],
): MetricsTimeSeries {
  const labels = buildDateLabels(periodDays);
  return {
    points: labels.map((date, index) => ({
      date,
      value: values[index] ?? values[values.length - 1] ?? 0,
    })),
  };
}

/** Low bounce trend for Parcel — healthy, below 4% risk. */
function buildParcelBounceSeries(periodDays: number): MetricsTimeSeries {
  const pattern15 = [
    0.85, 0.92, 1.05, 0.98, 1.12, 1.08, 1.15, 1.22, 1.18, 1.25, 1.1, 1.05,
    1.12, 1.08, 1.14,
  ];
  const values =
    periodDays === 15
      ? pattern15
      : Array.from({ length: periodDays }, (_, index) => {
          const t = index / Math.max(periodDays - 1, 1);
          return 0.75 + Math.sin(t * Math.PI * 1.4) * 0.35 + t * 0.45;
        }).map((v) => Math.round(v * 100) / 100);
  return buildPercentSeries(periodDays, values);
}

/** Low complain trend for Parcel — below 0.08% risk. */
function buildParcelComplainSeries(periodDays: number): MetricsTimeSeries {
  const pattern15 = [
    0.01, 0.02, 0.01, 0.03, 0.02, 0.04, 0.03, 0.02, 0.05, 0.03, 0.02, 0.04,
    0.03, 0.02, 0.03,
  ];
  const values =
    periodDays === 15
      ? pattern15
      : Array.from({ length: periodDays }, (_, index) => {
          const t = index / Math.max(periodDays - 1, 1);
          return 0.01 + Math.sin(t * Math.PI * 2) * 0.015 + t * 0.02;
        }).map((v) => Math.round(v * 1000) / 1000);
  return buildPercentSeries(periodDays, values);
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

function isParcelOrg(organizationId: OrganizationId): boolean {
  return organizationId === PARCEL_ID;
}

export function buildMockMetricsDashboard(
  organizationId: OrganizationId,
  filters: MetricsFilters,
): MetricsDashboard {
  const days = periodDays(filters.period);
  const emailsSeries = buildEmailSeries(days);
  const emailsSent = emailsSeries.points.reduce((sum, p) => sum + p.value, 0);
  const domainMultiplier = filters.domainId === 'all' ? 1 : 0.85;
  const parcel = isParcelOrg(organizationId);

  const bounceSeries = parcel
    ? buildParcelBounceSeries(days)
    : buildZeroPercentSeries(days);
  const complainSeries = parcel
    ? buildParcelComplainSeries(days)
    : buildZeroPercentSeries(days);

  const bounceRate = parcel ? 1.14 : 0;
  const complainRate = parcel ? 0.03 : 0;
  const transientBounces = parcel ? 1 : 0;
  const permanentBounces = parcel ? 0 : 0;
  const complainedCount = parcel ? 1 : 0;

  return {
    domains: [
      { id: 'all', label: 'All domains' },
      { id: 'parcel.io', label: 'parcel.io' },
    ],
    summary: {
      emailsSent: Math.round(emailsSent * domainMultiplier),
      deliverabilityRate: emailsSent > 0 ? 100 : 0,
    },
    comparison: {
      emailsSentPercent:
        filters.period === '90d' ? 8 : filters.period === '30d' ? 14 : 22,
      deliverabilityRatePoints: 0,
      bounceRatePoints: parcel ? -0.3 : 0,
      complainRatePoints: parcel ? 0.01 : 0,
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
      rate: bounceRate,
      series: bounceSeries,
      breakdown: [
        {
          kind: 'transient',
          count: transientBounces,
          rate: parcel ? 1.14 : 0,
        },
        {
          kind: 'permanent',
          count: permanentBounces,
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
      series: complainSeries,
      complainedCount,
      riskThresholdPercent: 0.08,
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
