import { Injectable, inject, signal } from '@angular/core';
import { buildRetrospectiveEmailRecords, type MetricsDashboard, type OrganizationId, type RetrospectiveSendPeriod, retrospectivePeriodToMetricsPeriod, type MetricsPeriod } from '@oequ/ports';
import { EMAILS_PORT } from '@oequ/ports-angular';
import { TranslocoService, translatePortError } from '@oequ/i18n';
import { toast } from '@spartan-ng/brain/sonner';

export interface MetricsRetrospectiveSimulationRequest {
  readonly organizationId: OrganizationId;
  readonly count: number;
  readonly period: RetrospectiveSendPeriod;
}

@Injectable({ providedIn: 'root' })
export class MetricsRetrospectiveSimulationService {
  private readonly emailsPort = inject(EMAILS_PORT);
  private readonly transloco = inject(TranslocoService);

  private readonly pending =
    signal<MetricsRetrospectiveSimulationRequest | null>(null);

  readonly running = signal(false);

  schedule(request: MetricsRetrospectiveSimulationRequest): void {
    this.pending.set(request);
  }

  metricsPeriodForPending(): MetricsPeriod | null {
    const pending = this.pending();
    return pending
      ? retrospectivePeriodToMetricsPeriod(pending.period)
      : null;
  }

  consumePending(
    organizationId: OrganizationId,
  ): MetricsRetrospectiveSimulationRequest | null {
    const pending = this.pending();
    if (!pending || pending.organizationId !== organizationId) {
      return null;
    }
    this.pending.set(null);
    return pending;
  }

  async runAnimated(
    request: MetricsRetrospectiveSimulationRequest,
    reloadMetrics: () => Promise<MetricsDashboard | null>,
  ): Promise<void> {
    if (this.running()) {
      return;
    }

    this.running.set(true);

    const plan = buildRetrospectiveEmailRecords(request.count, request.period);
    let totalCreated = 0;
    let hitLimit = false;

    try {
      if (plan.length > 0) {
        const result = await this.emailsPort.simulateOutbound(
          request.organizationId,
          { records: plan },
        );

        if (!result.ok) {
          hitLimit = true;
          toast.warning(translatePortError(result.error, this.transloco));
        } else {
          totalCreated = result.data.created.length;
          if (result.data.capped) {
            hitLimit = true;
            toast.warning(
              'Simulation stopped at your plan limit. Upgrade for higher volume.',
            );
          }
        }
      }

      await reloadMetrics();

      if (totalCreated > 0 && !hitLimit) {
        toast.success(
          `Simulated ${totalCreated.toLocaleString()} sends over ${request.period === 'today' ? 'today' : request.period === '7d' ? 'the last 7 days' : 'the last 30 days'}.`,
        );
      } else if (totalCreated > 0 && hitLimit) {
        toast.info(
          `Added ${totalCreated.toLocaleString()} sends before hitting your plan limit.`,
        );
      }
    } finally {
      this.running.set(false);
    }
  }
}
