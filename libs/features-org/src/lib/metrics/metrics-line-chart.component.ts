import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  CategoryScale,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import { formatMetricsChartDate } from '@oequ/ports';
import { ThemeService } from '@oequ/shell';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
);

export type MetricsChartTickFormat = 'count' | 'percent';

@Component({
  selector: 'oequ-metrics-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative h-[220px] w-full">
      <canvas #canvas class="size-full" role="img" [attr.aria-label]="ariaLabel()"></canvas>
      @if (riskThresholdPercent() !== null) {
        <div
          class="pointer-events-none absolute inset-x-0 border-t border-dashed border-amber-500/80"
          [style.bottom.%]="riskLineBottomPercent()"
        >
          <span
            class="text-amber-500/90 absolute -top-3.5 end-0 text-[10px] font-medium tracking-wide uppercase"
          >
            Risk
          </span>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class MetricsLineChartComponent implements AfterViewInit {
  readonly labels = input.required<readonly string[]>();
  readonly values = input.required<readonly number[]>();
  readonly yMax = input<number | null>(null);
  readonly tickFormat = input<MetricsChartTickFormat>('count');
  readonly lineColor = input<string>('oklch(0.62 0.17 145)');
  readonly fillArea = input(false);
  readonly riskThresholdPercent = input<number | null>(null);
  readonly ariaLabel = input('Metrics chart');

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly themeService = inject(ThemeService);

  private chart: Chart<'line'> | null = null;

  protected readonly riskLineBottomPercent = computed(() => {
    const threshold = this.riskThresholdPercent();
    const max = this.resolvedYMax();
    if (threshold === null || max <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (threshold / max) * 100));
  });

  private readonly resolvedYMax = computed(() => {
    const explicit = this.yMax();
    if (explicit !== null && explicit > 0) {
      return explicit;
    }
    const maxValue = Math.max(...this.values(), 0);
    if (this.tickFormat() === 'percent') {
      return maxValue > 0 ? Math.max(maxValue * 1.25, 0.1) : 0.1;
    }
    return maxValue > 0 ? Math.max(maxValue * 1.2, 4) : 4;
  });

  constructor() {
    effect(() => {
      this.themeService.resolvedDark();
      this.labels();
      this.values();
      this.yMax();
      this.tickFormat();
      this.lineColor();
      this.fillArea();
      this.rebuildChart();
    });

    this.destroyRef.onDestroy(() => {
      this.chart?.destroy();
      this.chart = null;
    });
  }

  ngAfterViewInit(): void {
    this.rebuildChart();
  }

  private rebuildChart(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    const colors = this.readThemeColors();
    const config = this.buildConfig(colors);

    if (this.chart) {
      this.chart.data = config.data!;
      if (config.options) {
        this.chart.options = config.options;
      }
      this.chart.update();
      return;
    }

    this.chart = new Chart(canvas, config);
  }

  private buildConfig(colors: ChartThemeColors): ChartConfiguration<'line'> {
    const formattedLabels = this.labels().map((iso) =>
      formatMetricsChartDate(iso),
    );

    return {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [
          {
            data: [...this.values()],
            borderColor: this.lineColor(),
            backgroundColor: this.fillArea()
              ? this.withAlpha(this.lineColor(), 0.12)
              : 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.35,
            fill: this.fillArea(),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.border,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => this.formatTick(Number(ctx.parsed.y)),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: colors.muted,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
              font: { size: 11 },
            },
          },
          y: {
            position: 'right',
            min: 0,
            max: this.resolvedYMax(),
            grid: {
              color: colors.grid,
              drawTicks: false,
            },
            border: { display: false },
            ticks: {
              color: colors.muted,
              maxTicksLimit: 5,
              font: { size: 11 },
              callback: (value) => this.formatTick(Number(value)),
            },
          },
        },
      },
    };
  }

  private formatTick(value: number): string {
    if (this.tickFormat() === 'percent') {
      return `${value}%`;
    }
    return String(Math.round(value));
  }

  private readThemeColors(): ChartThemeColors {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    return {
      muted: style.getPropertyValue('--muted-foreground').trim() || '#888',
      grid: style.getPropertyValue('--border').trim() || '#333',
      border: style.getPropertyValue('--border').trim() || '#333',
      tooltipBg: style.getPropertyValue('--popover').trim() || '#111',
      tooltipText: style.getPropertyValue('--popover-foreground').trim() || '#fff',
    };
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('oklch(')) {
      return color.replace(/\)$/, ` / ${alpha})`);
    }
    return color;
  }
}

interface ChartThemeColors {
  muted: string;
  grid: string;
  border: string;
  tooltipBg: string;
  tooltipText: string;
}
