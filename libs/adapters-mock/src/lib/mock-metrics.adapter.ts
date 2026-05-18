import { Injectable } from '@angular/core';
import {
  METRICS_PORT,
  type MetricsDashboard,
  type MetricsFilters,
  type MetricsPort,
  type OrganizationId,
  portOk,
  type PortResult,
} from '@oequ/ports';

import { buildMockMetricsDashboard } from './data/mock-metrics-data';

const MOCK_LATENCY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class MockMetricsAdapter implements MetricsPort {
  async getMetrics(
    _organizationId: OrganizationId,
    filters: MetricsFilters,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<MetricsDashboard>> {
    await delay(MOCK_LATENCY_MS);
    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    return portOk(buildMockMetricsDashboard(filters));
  }
}

export const MOCK_METRICS_PROVIDER = {
  provide: METRICS_PORT,
  useExisting: MockMetricsAdapter,
};
