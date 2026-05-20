import { Injectable, inject, signal } from '@angular/core';
import {
  EMAILS_PORT,
  buildRetrospectiveEmailRecords,
  type OrganizationId,
  type RetrospectiveSendPeriod,
  retrospectivePeriodToMetricsPeriod,
  type MetricsPeriod,
} from '@oequ/ports';
import { toast } from '@spartan-ng/brain/sonner';

export interface MetricsRetrospectiveSimulationRequest {
  readonly organizationId: OrganizationId;
  readonly count: number;
  readonly period: RetrospectiveSendPeriod;
}

const ANIMATION_MS = 2_000;
const ANIMATION_STEPS = 20;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable({ providedIn: 'root' })
export class MetricsRetrospectiveSimulationService {
  private readonly emailsPort = inject(EMAILS_PORT);

  private readonly pending =
    signal<MetricsRetrospectiveSimulationRequest | null>(null);

  readonly running = signal(false);
  readonly progress = signal(0);

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
    reloadMetrics: () => Promise<void>,
  ): Promise<void> {
    if (this.running()) {
      return;
    }

    this.running.set(true);
    this.progress.set(0);

    const plan = buildRetrospectiveEmailRecords(request.count, request.period);
    const chunkSize = Math.max(1, Math.ceil(plan.length / ANIMATION_STEPS));
    let totalCreated = 0;
    let hitLimit = false;
    const stepDelay = ANIMATION_MS / ANIMATION_STEPS;

    try {
      for (let step = 0; step < ANIMATION_STEPS; step++) {
        const start = step * chunkSize;
        const chunk = plan.slice(start, start + chunkSize);
        if (!chunk.length) {
          this.progress.set((step + 1) / ANIMATION_STEPS);
          await delay(stepDelay);
          continue;
        }

        const result = await this.emailsPort.simulateOutbound(
          request.organizationId,
          { records: chunk },
        );

        if (!result.ok) {
          hitLimit = true;
          toast.warning(result.error.message);
          break;
        }

        totalCreated += result.data.created.length;
        if (result.data.capped) {
          hitLimit = true;
          toast.warning(
            'Simulation stopped at your plan limit. Upgrade for higher volume.',
          );
          break;
        }

        await reloadMetrics();
        this.progress.set((step + 1) / ANIMATION_STEPS);
        await delay(stepDelay);
      }

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
      this.progress.set(1);
    }
  }
}
