import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleHelp } from '@ng-icons/lucide';
import {
  formatMetricsPercent,
  type BounceBreakdownItem,
  type MetricsTimeSeries,
} from '@oequ/ports';
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
    HlmCardImports,
    HlmTooltipImports,
    MetricsLineChartComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideCircleHelp })],
  template: `
    <section hlmCard class="border-input gap-0 overflow-hidden rounded-[5px] py-0">
      <div hlmCardContent class="!p-5">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {{ title() }}
            </p>
            <p class="mt-1 text-3xl font-semibold tracking-tight">
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
          [yMax]="yMax()"
          tickFormat="percent"
          [lineColor]="lineColor()"
          [riskThresholdPercent]="riskThresholdPercent()"
          [attr.aria-label]="title() + ' chart'"
        />

        <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          @for (item of legendItems(); track item.label) {
            <li class="text-muted-foreground flex items-center gap-2">
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
  readonly yMax = input.required<number>();
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
