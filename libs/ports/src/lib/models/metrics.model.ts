import type { OrganizationId } from './org.model';

export type MetricsPeriod = '15d' | '30d' | '90d';

export type MetricsDomainId = 'all' | string;

export type MetricsEventFilter = 'all_events';

export interface MetricsFilters {
  readonly domainId: MetricsDomainId;
  readonly period: MetricsPeriod;
  readonly eventFilter: MetricsEventFilter;
}

export interface MetricsDomainOption {
  readonly id: MetricsDomainId;
  readonly label: string;
}

export interface TimeSeriesPoint {
  readonly date: string;
  readonly value: number;
}

export interface MetricsTimeSeries {
  readonly points: readonly TimeSeriesPoint[];
}

export interface MetricsDomainBreakdown {
  readonly domain: string;
  readonly count: number;
  readonly deliverabilityRate: number;
}

export interface BounceBreakdownItem {
  readonly kind: 'transient' | 'permanent' | 'undetermined';
  readonly count: number;
  readonly rate: number;
}

export interface BounceMetrics {
  readonly rate: number;
  readonly series: MetricsTimeSeries;
  readonly breakdown: readonly BounceBreakdownItem[];
  readonly riskThresholdPercent: number;
}

export interface ComplainMetrics {
  readonly rate: number;
  readonly series: MetricsTimeSeries;
  readonly complainedCount: number;
  readonly riskThresholdPercent: number;
}

export interface MetricsSummary {
  readonly emailsSent: number;
  readonly deliverabilityRate: number;
}

export interface MetricsDashboard {
  readonly domains: readonly MetricsDomainOption[];
  readonly summary: MetricsSummary;
  readonly emailsSeries: MetricsTimeSeries;
  readonly domainBreakdown: readonly MetricsDomainBreakdown[];
  readonly bounce: BounceMetrics;
  readonly complain: ComplainMetrics;
  readonly lastUpdatedAt: string;
}

export interface MetricsQuery {
  readonly organizationId: OrganizationId;
  readonly filters: MetricsFilters;
}
