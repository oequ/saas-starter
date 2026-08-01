import { inject, Injectable } from '@angular/core';
import { buildMetricsDashboardFromEmails, type MetricsDashboard, type MetricsFilters, type MetricsPort, type OrganizationId, portOk, type PortResult } from '@oequ/ports';
import { METRICS_PORT } from '@oequ/ports-angular';

import { SupabaseEmailsAdapter } from './supabase-emails.adapter';

@Injectable()
export class WebMetricsAdapter implements MetricsPort {
  private readonly emails = inject(SupabaseEmailsAdapter);

  async getMetrics(
    organizationId: OrganizationId,
    filters: MetricsFilters,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<MetricsDashboard>> {
    const emailsResult = await this.emails.listOutbound(
      organizationId,
      { period: filters.period },
      abortSignal,
    );

    if (emailsResult.ok === false) {
      return emailsResult;
    }

    return portOk(
      buildMetricsDashboardFromEmails(
        organizationId,
        filters,
        emailsResult.data,
      ),
    );
  }
}

export const WEB_METRICS_PROVIDER = {
  provide: METRICS_PORT,
  useExisting: WebMetricsAdapter,
};
