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
  type Plugin,
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

const crosshairPlugin: Plugin<'line'> = {
  id: 'metricsCrosshair',
  afterDraw(chart) {
    const active = chart.tooltip?.getActiveElements();
    if (!active?.length) {
      return;
    }
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    if (x === undefined || !chartArea) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = withAlpha(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--muted-foreground')
        .trim() || '#888',
      0.45,
    );
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

@Component({
  selector: 'oequ-metrics-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" [style.height.px]="height()">
      <canvas #canvas class="size-full" role="img" [attr.aria-label]="ariaLabel()"></canvas>
      @if (riskThresholdPercent() !== null) {
        <div
          class="pointer-events-none absolute inset-x-0 border-t border-dashed border-amber-500/70"
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
  readonly height = input(220);

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
    const threshold = this.riskThresholdPercent() ?? 0;
    const maxValue = Math.max(...this.values(), threshold, 0);
    const explicit = this.yMax();

    if (this.tickFormat() === 'percent') {
      const fromData =
        maxValue > 0 ? Math.ceil(maxValue * 1.2 * 100) / 100 : Math.max(threshold * 2, 0.1);
      if (explicit !== null && explicit > 0) {
        return Math.max(explicit, fromData);
      }
      return fromData;
    }

    const fromData = maxValue > 0 ? Math.max(maxValue * 1.2, 4) : 4;
    if (explicit !== null && explicit > 0) {
      return Math.max(explicit, fromData);
    }
    return fromData;
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
      this.height();
      this.rebuildChart(true);
    });

    this.destroyRef.onDestroy(() => {
      this.chart?.destroy();
      this.chart = null;
    });
  }

  ngAfterViewInit(): void {
    this.rebuildChart(false);
  }

  private rebuildChart(animate: boolean): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    const colors = this.readThemeColors();
    const config = this.buildConfig(colors, animate);

    if (this.chart) {
      this.chart.data = config.data!;
      if (config.options) {
        this.chart.options = config.options;
      }
      this.chart.update(animate ? 'active' : 'none');
      return;
    }

    this.chart = new Chart(canvas, config);
  }

  private buildConfig(
    colors: ChartThemeColors,
    animate: boolean,
  ): ChartConfiguration<'line'> {
    const formattedLabels = this.labels().map((iso) =>
      formatMetricsChartDate(iso),
    );
    const lineColor = this.lineColor();

    return {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [
          {
            data: [...this.values()],
            borderColor: lineColor,
            backgroundColor: (context) =>
              this.fillArea()
                ? this.areaGradient(context.chart, lineColor)
                : 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBackgroundColor: lineColor,
            pointHoverBorderColor: colors.tooltipBg,
            tension: 0.35,
            fill: this.fillArea(),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animate ? { duration: 380, easing: 'easeOutQuad' } : false,
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
            padding: 10,
            displayColors: false,
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
              color: withAlpha(colors.grid, 0.65),
              drawTicks: false,
              tickLength: 0,
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
      plugins: [crosshairPlugin],
    };
  }

  private areaGradient(chart: Chart, lineColor: string): string | CanvasGradient {
    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return withAlpha(lineColor, 0.15);
    }
    const gradient = ctx.createLinearGradient(
      0,
      chartArea.top,
      0,
      chartArea.bottom,
    );
    gradient.addColorStop(0, withAlpha(lineColor, 0.35));
    gradient.addColorStop(0.55, withAlpha(lineColor, 0.08));
    gradient.addColorStop(1, withAlpha(lineColor, 0));
    return gradient;
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
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('oklch(')) {
    return color.replace(/\)$/, ` / ${alpha})`);
  }
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

interface ChartThemeColors {
  muted: string;
  grid: string;
  border: string;
  tooltipBg: string;
  tooltipText: string;
}
