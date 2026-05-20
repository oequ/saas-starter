import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleHelp } from '@ng-icons/lucide';
import {
  formatMetricsPercent,
  type BounceBreakdownItem,
  type MetricsTimeSeries,
} from '@oequ/ports';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { MetricsLineChartComponent } from './metrics-line-chart.component';

export interface MetricsLegendItem {
  readonly label: string;
  readonly count: number;
  readonly rate: number;
  readonly dotClass: string;
}

@Component({
  selector: 'oequ-metrics-stat-card',
  imports: [
    NgIcon,
    HlmBadgeImports,
    HlmCardImports,
    HlmTooltipImports,
    MetricsLineChartComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideCircleHelp })],
  template: `
    <section
      hlmCard
      variant="outline"
      class="bg-muted/30 ring-border/60 gap-0 overflow-hidden rounded-xl border-0 py-0 ring-1 ring-inset"
    >
      <div hlmCardContent class="!p-5">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {{ title() }}
              </p>
              <span hlmBadge [variant]="healthBadgeVariant()">{{ healthLabel() }}</span>
            </div>
            <p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {{ formatMetricsPercent(rate(), { decimals: rateDecimals() }) }}
            </p>
          </div>
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
            [hlmTooltip]="tooltip()"
            aria-label="More information"
          >
            <ng-icon name="lucideCircleHelp" class="size-4" aria-hidden="true" />
          </button>
        </div>

        <oequ-metrics-line-chart
          [labels]="seriesLabels()"
          [values]="seriesValues()"
          [yMax]="chartYMax()"
          tickFormat="percent"
          [lineColor]="lineColor()"
          [riskThresholdPercent]="riskThresholdPercent()"
          [height]="160"
          [attr.aria-label]="title() + ' chart'"
        />

        <ul class="mt-4 flex flex-wrap gap-2 text-xs">
          @for (item of legendItems(); track item.label) {
            <li
              class="bg-muted/40 text-muted-foreground inline-flex items-center gap-2 rounded-full px-2.5 py-1"
            >
              <span class="size-2 shrink-0 rounded-full" [class]="item.dotClass"></span>
              <span>{{ item.label }}</span>
              <span class="text-foreground tabular-nums"
                >{{ item.count }}
                {{ formatMetricsPercent(item.rate, { decimals: 2 }) }}</span
              >
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class MetricsStatCardComponent {
  readonly title = input.required<string>();
  readonly rate = input.required<number>();
  readonly rateDecimals = input(0);
  readonly tooltip = input('');
  readonly series = input.required<MetricsTimeSeries>();
  readonly lineColor = input('oklch(0.577 0.245 27.325)');
  readonly riskThresholdPercent = input.required<number>();
  readonly legendItems = input.required<readonly MetricsLegendItem[]>();

  protected readonly formatMetricsPercent = formatMetricsPercent;

  protected readonly seriesLabels = computed(() =>
    this.series().points.map((point) => point.date),
  );

  protected readonly seriesValues = computed(() =>
    this.series().points.map((point) => point.value),
  );

  /** Headroom above peak series value, period rate, and risk line. */
  protected readonly chartYMax = computed(() => {
    const risk = this.riskThresholdPercent();
    const peak = Math.max(...this.seriesValues(), this.rate(), risk, 0);
    if (peak <= 0) {
      return Math.max(risk * 2, 0.1);
    }
    return Math.ceil(peak * 1.2 * 100) / 100;
  });

  protected readonly healthLabel = computed(() => {
    const rate = this.rate();
    const risk = this.riskThresholdPercent();
    if (rate === 0) {
      return 'Healthy';
    }
    return rate >= risk ? 'Above risk' : 'Healthy';
  });

  protected readonly healthBadgeVariant = computed(() => {
    const rate = this.rate();
    const risk = this.riskThresholdPercent();
    if (rate >= risk) {
      return 'destructive' as const;
    }
    return 'secondary' as const;
  });
}

export function bounceLegendItems(
  breakdown: readonly BounceBreakdownItem[],
): readonly MetricsLegendItem[] {
  const labels: Record<BounceBreakdownItem['kind'], string> = {
    transient: 'Transient',
    permanent: 'Permanent',
    undetermined: 'Undetermined',
  };
  const dots: Record<BounceBreakdownItem['kind'], string> = {
    transient: 'bg-red-500',
    permanent: 'bg-red-400',
    undetermined: 'bg-red-300',
  };
  return breakdown.map((item) => ({
    label: labels[item.kind],
    count: item.count,
    rate: item.rate,
    dotClass: dots[item.kind],
  }));
}
