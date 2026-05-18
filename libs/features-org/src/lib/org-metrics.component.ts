import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import {
  METRICS_PORT,
  metricsPeriodLabel,
  type MetricsDomainId,
  type MetricsEventFilter,
  type MetricsFilters,
  type MetricsPeriod,
  formatMetricsLastUpdated,
} from '@oequ/ports';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { MetricsEmailsCardComponent } from './metrics/metrics-emails-card.component';
import {
  MetricsStatCardComponent,
  bounceLegendItems,
  type MetricsLegendItem,
} from './metrics/metrics-stat-card.component';

@Component({
  selector: 'oequ-org-metrics',
  imports: [
    HlmSelectImports,
    MetricsEmailsCardComponent,
    MetricsStatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-semibold tracking-tight">Metrics</h1>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <hlm-select
            class="w-full sm:w-44"
            [value]="domainFilter()"
            (valueChange)="onDomainChange($event)"
          >
            <hlm-select-trigger class="h-9 w-full shadow-none">
              <span class="truncate">{{ selectedDomainLabel() }}</span>
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
              @for (domain of domainOptions(); track domain.id) {
                <hlm-select-item [value]="domain.id">{{ domain.label }}</hlm-select-item>
              }
            </hlm-select-content>
          </hlm-select>

          <hlm-select
            class="w-full sm:w-44"
            [value]="periodFilter()"
            (valueChange)="onPeriodChange($event)"
          >
            <hlm-select-trigger class="h-9 w-full shadow-none">
              <span class="truncate">{{ metricsPeriodLabel(periodFilter()) }}</span>
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
              <hlm-select-item value="15d">Last 15 days</hlm-select-item>
              <hlm-select-item value="30d">Last 30 days</hlm-select-item>
              <hlm-select-item value="90d">Last 90 days</hlm-select-item>
            </hlm-select-content>
          </hlm-select>
        </div>
      </div>

      @if (metricsLoading()) {
        <div
          class="border-input text-muted-foreground flex min-h-[420px] items-center justify-center rounded-[5px] border text-sm"
        >
          Loading metrics…
        </div>
      } @else if (metricsError()) {
        <div
          class="border-input text-destructive flex min-h-[420px] items-center justify-center rounded-[5px] border text-sm"
        >
          {{ metricsError() }}
        </div>
      } @else if (metrics(); as data) {
        <oequ-metrics-emails-card [dashboard]="data" />

        <div class="grid gap-4 lg:grid-cols-2">
          <oequ-metrics-stat-card
            title="Bounce rate"
            [rate]="data.bounce.rate"
            tooltip="Percentage of emails that bounced."
            [series]="data.bounce.series"
            [yMax]="10"
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
            [yMax]="0.2"
            lineColor="oklch(0.75 0.15 85)"
            [riskThresholdPercent]="data.complain.riskThresholdPercent"
            [legendItems]="complainLegendItems()"
          />
        </div>

        <p class="text-muted-foreground text-sm">
          Data is updated every 15 minutes. Last updated
          {{ formatMetricsLastUpdated(data.lastUpdatedAt) }}.
        </p>
      }
    </div>
  `,
})
export class OrgMetricsComponent {
  readonly organizationId = input.required<string>();

  private readonly metricsPort = inject(METRICS_PORT);

  protected readonly domainFilter = signal<MetricsDomainId>('all');
  protected readonly periodFilter = signal<MetricsPeriod>('15d');
  protected readonly eventFilter = signal<MetricsEventFilter>('all_events');

  private readonly filters = computed<MetricsFilters>(() => ({
    domainId: this.domainFilter(),
    period: this.periodFilter(),
    eventFilter: this.eventFilter(),
  }));

  private readonly dataRefresh = signal(0);

  protected readonly metricsResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      filters: this.filters(),
      refresh: this.dataRefresh(),
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

  protected readonly metricsPeriodLabel = metricsPeriodLabel;
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

  protected onPeriodChange(value: string | string[] | null | undefined): void {
    const next = Array.isArray(value) ? value[0] : value;
    if (next === '15d' || next === '30d' || next === '90d') {
      this.periodFilter.set(next);
    }
  }
}
