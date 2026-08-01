import type { PortResult } from './models/common.model';
import type { MetricsDashboard, MetricsFilters } from './models/metrics.model';
import type { OrganizationId } from './models/org.model';

export interface MetricsPort {
  getMetrics(
    organizationId: OrganizationId,
    filters: MetricsFilters,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<MetricsDashboard>>;
}

