import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  formatMetricsCount,
  formatMetricsPercent,
  type MetricsDashboard,
} from '@oequ/ports';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { MetricsLineChartComponent } from './metrics-line-chart.component';

@Component({
  selector: 'oequ-metrics-emails-card',
  imports: [HlmCardImports, HlmSelectImports, MetricsLineChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section hlmCard class="border-input gap-0 overflow-hidden rounded-[5px] py-0">
      <div hlmCardContent class="!p-5">
        <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex flex-wrap gap-8">
            <div>
              <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Emails
              </p>
              <p class="mt-1 text-3xl font-semibold tracking-tight">
                {{ formatMetricsCount(dashboard().summary.emailsSent) }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Deliverability rate
              </p>
              <p class="mt-1 text-3xl font-semibold tracking-tight">
                {{
                  formatMetricsPercent(dashboard().summary.deliverabilityRate, {
                    decimals: 0,
                  })
                }}
              </p>
            </div>
          </div>

          <hlm-select class="w-full sm:w-40" value="all_events">
            <hlm-select-trigger class="h-9 w-full shadow-none">
              <span class="truncate">All Events</span>
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal class="w-[var(--brn-select-width)]">
              <hlm-select-item value="all_events">All Events</hlm-select-item>
            </hlm-select-content>
          </hlm-select>
        </div>

        <oequ-metrics-line-chart
          [labels]="seriesLabels()"
          [values]="seriesValues()"
          [yMax]="emailsYMax()"
          tickFormat="count"
          lineColor="oklch(0.62 0.17 145)"
          [fillArea]="true"
          ariaLabel="Emails sent over time"
        />

        @if (primaryDomain(); as domain) {
          <div class="mt-4 flex items-center justify-between gap-3 text-sm">
            <div class="flex min-w-0 items-center gap-2">
              <span class="size-2 shrink-0 rounded-full bg-emerald-500"></span>
              <span class="truncate">
                {{ domain.domain }} ({{ formatMetricsCount(domain.count) }})
              </span>
            </div>
            <span class="text-muted-foreground shrink-0 tabular-nums">
              {{
                formatMetricsPercent(domain.deliverabilityRate, { decimals: 0 })
              }}
            </span>
          </div>
        }
      </div>
    </section>
  `,
})
export class MetricsEmailsCardComponent {
  readonly dashboard = input.required<MetricsDashboard>();

  protected readonly formatMetricsCount = formatMetricsCount;
  protected readonly formatMetricsPercent = formatMetricsPercent;

  protected readonly seriesLabels = computed(() =>
    this.dashboard().emailsSeries.points.map((point) => point.date),
  );

  protected readonly seriesValues = computed(() =>
    this.dashboard().emailsSeries.points.map((point) => point.value),
  );

  protected readonly emailsYMax = computed(() => {
    const max = Math.max(...this.seriesValues(), 0);
    return max > 0 ? Math.ceil(max * 1.15) : 12;
  });

  protected readonly primaryDomain = computed(
    () => this.dashboard().domainBreakdown[0] ?? null,
  );
}
