import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

import {
  buildShowcaseUsageCharts,
  getShowcaseUsageEvents,
  type ShowcaseUsageChartFormat,
  type ShowcaseUsageMetricChart,
} from './showcase.data';

interface ChartCoord {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly value: number;
}

interface ChartLayout {
  readonly id: string;
  readonly chart: ShowcaseUsageMetricChart;
  readonly width: number;
  readonly height: number;
  readonly coords: readonly ChartCoord[];
  readonly linePath: string;
  readonly yTicks: readonly { readonly y: number; readonly label: string }[];
  readonly xStartLabel: string;
  readonly xEndLabel: string;
  readonly formattedTotal: string;
}

@Component({
  selector: 'ac-showcase-usage-chart',
  imports: [HlmCardImports],
  templateUrl: './showcase-usage-chart.component.html',
  styleUrl: './showcase-usage-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseUsageChartComponent {
  readonly animate = input(false);
  readonly includeTourRequest = input(false);
  readonly tourUsageOccurredAt = input<string | null>(null);

  protected readonly panels = computed(() => {
    const now = new Date();
    const events = getShowcaseUsageEvents(
      this.includeTourRequest(),
      this.tourUsageOccurredAt(),
      now,
    );
    const charts = buildShowcaseUsageCharts(events, now);
    return [
      buildPanelLayout('spend', charts.spend),
      buildPanelLayout('requests', charts.requests),
    ];
  });
}

function buildPanelLayout(
  id: string,
  chart: ShowcaseUsageMetricChart,
): ChartLayout {
  const width = 320;
  const height = 108;
  const pad = { top: 10, right: 10, bottom: 22, left: 34 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const maxValue = Math.max(...chart.points.map((point) => point.value), 0.001);
  const yMax = niceMax(maxValue, chart.format);

  const coords: ChartCoord[] = chart.points.map((point, index) => ({
    x:
      pad.left +
      (chart.points.length === 1
        ? innerWidth
        : (index / (chart.points.length - 1)) * innerWidth),
    y: pad.top + innerHeight - (point.value / yMax) * innerHeight,
    label: point.label,
    value: point.value,
  }));

  const tickCount = 2;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (yMax / tickCount) * index;
    return {
      y: pad.top + innerHeight - (value / yMax) * innerHeight,
      label: formatAxisValue(value, chart.format),
    };
  });

  return {
    id,
    chart,
    width,
    height,
    coords,
    linePath: buildLinearPath(coords),
    yTicks,
    xStartLabel: chart.points[0]?.label ?? '',
    xEndLabel: chart.points[chart.points.length - 1]?.label ?? '',
    formattedTotal: formatTotal(chart.total, chart.format),
  };
}

function niceMax(value: number, format: ShowcaseUsageChartFormat): number {
  if (format === 'currency') {
    if (value <= 0) {
      return 0.03;
    }
    const step = value <= 0.12 ? 0.03 : value <= 0.3 ? 0.06 : 0.1;
    return Math.ceil((value * 1.15) / step) * step;
  }

  const step = value <= 3 ? 1 : value <= 8 ? 2 : 4;
  return Math.max(2, Math.ceil((value * 1.15) / step) * step);
}

function formatTotal(total: number, format: ShowcaseUsageChartFormat): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total);
  }

  return new Intl.NumberFormat('en-US').format(total);
}

function formatAxisValue(
  value: number,
  format: ShowcaseUsageChartFormat,
): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return String(Math.round(value));
}

function buildLinearPath(points: readonly ChartCoord[]): string {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    )
    .join(' ');
}
