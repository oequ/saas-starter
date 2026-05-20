import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGlobe } from '@ng-icons/lucide';
import {
  METRICS_PORT,
  type MetricsDomainId,
  type MetricsEventFilter,
  type MetricsFilters,
  type MetricsPeriod,
  formatMetricsLastUpdated,
} from '@oequ/ports';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { MetricsEmailsCardComponent } from './metrics/metrics-emails-card.component';
import { MetricsKpiRowComponent } from './metrics/metrics-kpi-row.component';
import { MetricsPageSkeletonComponent } from './metrics/metrics-page-skeleton.component';
import { MetricsRetrospectiveSimulationService } from './onboarding/metrics-retrospective-simulation.service';
import { MetricsPeriodSegmentComponent } from './metrics/metrics-period-segment.component';
import {
  MetricsStatCardComponent,
  bounceLegendItems,
  type MetricsLegendItem,
} from './metrics/metrics-stat-card.component';

@Component({
  selector: 'oequ-org-metrics',
  imports: [
    NgIcon,
    HlmSelectImports,
    MetricsPeriodSegmentComponent,
    MetricsKpiRowComponent,
    MetricsPageSkeletonComponent,
    MetricsEmailsCardComponent,
    MetricsStatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideGlobe })],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Metrics</h1>
          <p class="text-muted-foreground mt-1 text-sm">
            Email delivery performance for your workspace
            @if (metrics(); as data) {
              <span class="text-muted-foreground/80">
                · Updated {{ formatMetricsLastUpdated(data.lastUpdatedAt) }}
              </span>
            }
          </p>
        </div>

        <div
          class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        >
          <oequ-metrics-period-segment
            [value]="periodFilter()"
            (periodChange)="periodFilter.set($event)"
          />

          <hlm-select
            class="w-full sm:w-48"
            [value]="domainFilter()"
            (valueChange)="onDomainChange($event)"
          >
            <hlm-select-trigger class="border-input h-9 w-full rounded-lg shadow-none">
              <span class="flex min-w-0 items-center gap-2">
                <ng-icon name="lucideGlobe" class="size-4 shrink-0 opacity-70" />
                <span class="truncate">{{ selectedDomainLabel() }}</span>
              </span>
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
              @for (domain of domainOptions(); track domain.id) {
                <hlm-select-item [value]="domain.id">{{ domain.label }}</hlm-select-item>
              }
            </hlm-select-content>
          </hlm-select>
        </div>
      </div>

      @if (metricsLoading() && !metrics()) {
        <oequ-metrics-page-skeleton />
      } @else if (metricsError() && !metrics()) {
        <div
          class="border-input text-destructive flex min-h-[420px] items-center justify-center rounded-xl border text-sm"
        >
          {{ metricsError() }}
        </div>
      } @else if (metrics(); as data) {
        <div class="relative flex flex-col gap-5">
          @if (retrospectiveSimulation.running()) {
            <div
              class="bg-background/70 absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              <span class="text-sm font-medium">Simulating send history…</span>
              <span class="text-muted-foreground text-xs tabular-nums">
                {{ simulationProgressPercent() }}%
              </span>
              <div class="bg-muted mt-1 h-1.5 w-48 overflow-hidden rounded-full">
                <div
                  class="bg-primary h-full rounded-full transition-[width] duration-200"
                  [style.width.%]="simulationProgressPercent()"
                ></div>
              </div>
            </div>
          } @else if (metricsLoading()) {
            <div
              class="bg-background/60 absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-[1px]"
              aria-hidden="true"
            >
              <span class="text-muted-foreground text-sm">Updating…</span>
            </div>
          }

          <oequ-metrics-kpi-row [dashboard]="data" />

          <oequ-metrics-emails-card [dashboard]="data" />

          <div class="grid gap-4 lg:grid-cols-2">
            <oequ-metrics-stat-card
              title="Bounce rate"
              [rate]="data.bounce.rate"
              tooltip="Percentage of emails that bounced."
              [series]="data.bounce.series"
              lineColor="oklch(0.577 0.245 27.325)"
              [riskThresholdPercent]="data.bounce.riskThresholdPercent"
              [legendItems]="bounceLegendItems(data.bounce.breakdown)"
            />

            <oequ-metrics-stat-card
              title="Complain rate"
              [rate]="data.complain.rate"
              [rateDecimals]="2"
              tooltip="Percentage of emails marked as spam."
              [series]="data.complain.series"
              lineColor="oklch(0.75 0.15 85)"
              [riskThresholdPercent]="data.complain.riskThresholdPercent"
              [legendItems]="complainLegendItems()"
            />
          </div>

          <p class="text-muted-foreground text-sm">
            Data is updated every 15 minutes.
          </p>
        </div>
      }
    </div>
  `,
})
export class OrgMetricsComponent {
  readonly organizationId = input.required<string>();

  private readonly metricsPort = inject(METRICS_PORT);
  protected readonly retrospectiveSimulation = inject(
    MetricsRetrospectiveSimulationService,
  );

  private simulationKickoffStarted = false;

  protected readonly domainFilter = signal<MetricsDomainId>('all');
  protected readonly periodFilter = signal<MetricsPeriod>('15d');
  protected readonly eventFilter = signal<MetricsEventFilter>('all_events');

  constructor() {
    const pendingPeriod =
      this.retrospectiveSimulation.metricsPeriodForPending();
    if (pendingPeriod) {
      this.periodFilter.set(pendingPeriod);
    }

    effect(() => {
      const orgId = this.organizationId();
      const data = this.metrics();
      const loading = this.metricsLoading();
      const simRunning = this.retrospectiveSimulation.running();

      if (
        this.simulationKickoffStarted ||
        simRunning ||
        loading ||
        !data
      ) {
        return;
      }

      const pending = this.retrospectiveSimulation.consumePending(orgId);
      if (!pending) {
        return;
      }

      this.simulationKickoffStarted = true;
      void this.retrospectiveSimulation.runAnimated(pending, async () => {
        await this.metricsResource.reload();
      });
    });
  }

  protected readonly simulationProgressPercent = computed(() =>
    Math.round(this.retrospectiveSimulation.progress() * 100),
  );

  private readonly filters = computed<MetricsFilters>(() => ({
    domainId: this.domainFilter(),
    period: this.periodFilter(),
    eventFilter: this.eventFilter(),
  }));

  protected readonly metricsResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      filters: this.filters(),
    }),
    loader: async ({ params, abortSignal }) => {
      const result = await this.metricsPort.getMetrics(
        params.orgId,
        params.filters,
        abortSignal,
      );
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly metrics = computed(() => this.metricsResource.value());
  protected readonly metricsLoading = computed(() =>
    this.metricsResource.isLoading(),
  );
  protected readonly metricsError = computed(() => {
    const error = this.metricsResource.error();
    return error instanceof Error ? error.message : null;
  });

  protected readonly domainOptions = computed(
    () => this.metrics()?.domains ?? [{ id: 'all', label: 'All domains' }],
  );

  protected readonly selectedDomainLabel = computed(() => {
    const current = this.domainFilter();
    return (
      this.domainOptions().find((domain) => domain.id === current)?.label ??
      'All domains'
    );
  });

  protected readonly formatMetricsLastUpdated = formatMetricsLastUpdated;
  protected readonly bounceLegendItems = bounceLegendItems;

  protected complainLegendItems(): readonly MetricsLegendItem[] {
    const data = this.metrics();
    if (!data) {
      return [];
    }
    return [
      {
        label: 'Complained',
        count: data.complain.complainedCount,
        rate: data.complain.rate,
        dotClass: 'bg-amber-400',
      },
    ];
  }

  protected onDomainChange(value: string | string[] | null | undefined): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (next) {
      this.domainFilter.set(next);
    }
  }
}
