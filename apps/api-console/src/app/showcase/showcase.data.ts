export interface ShowcaseStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly navPath: string;
  readonly navLabel: string;
}

export interface ShowcaseUsageEvent {
  readonly occurredAt: string;
  readonly endpoint: string;
  readonly eventType: 'api_call';
  readonly quantity: number;
  readonly httpStatus: number;
  readonly latencyMs: number;
}

export interface ShowcaseUsageRow {
  readonly time: string;
  readonly endpoint: string;
  readonly eventType: string;
  readonly quantity: number;
  readonly httpStatus: number;
  readonly latencyMs: number;
}

export const SHOWCASE_STEPS: readonly ShowcaseStep[] = [
  {
    id: 'overview',
    title: 'Overview',
    description:
      'See project ID, quota, and a short checklist to get your first request out the door.',
    navPath: '/overview',
    navLabel: 'Overview',
  },
  {
    id: 'keys',
    title: 'API Keys',
    description:
      'Create and manage keys scoped to your workspace. Secrets are shown once at creation.',
    navPath: '/keys',
    navLabel: 'API Keys',
  },
  {
    id: 'playground',
    title: 'Playground',
    description:
      'Send preset requests with your key and inspect the JSON response without leaving the console.',
    navPath: '/playground',
    navLabel: 'Playground',
  },
  {
    id: 'usage',
    title: 'Usage',
    description:
      'Track recent API activity — endpoints, units consumed, status codes, and latency.',
    navPath: '/metered-usage',
    navLabel: 'Usage',
  },
] as const;

export const SHOWCASE_PROJECT_ID = 'proj_7k2m9x4q';

export const SHOWCASE_API_KEY = {
  name: 'Production',
  prefix: 'sk_live_8f3a',
  created: '2 days ago',
  lastUsed: '1 hr ago',
} as const;

export interface ShowcaseApiKeyRow {
  readonly name: string;
  readonly prefix: string;
  readonly created: string;
  readonly lastUsed: string;
}

export const SHOWCASE_NEW_KEY_NAME = 'Staging';

export const SHOWCASE_NEW_KEY_SECRET =
  'sk_live_9x2k8m4n5p6q7r8s9t0uvwx_yz12';

export const SHOWCASE_NEW_API_KEY_ROW: ShowcaseApiKeyRow = {
  name: SHOWCASE_NEW_KEY_NAME,
  prefix: 'sk_live_9x2k',
  created: 'just now',
  lastUsed: '—',
};

export const SHOWCASE_MONTHLY_QUOTA = 1000;

export function getShowcaseBillableUnits(
  events?: readonly ShowcaseUsageEvent[],
): number {
  return (events ?? resolveShowcaseUsageEvents()).reduce(
    (sum, event) => sum + event.quantity,
    0,
  );
}

export function getShowcaseQuotaRemaining(
  events?: readonly ShowcaseUsageEvent[],
): number {
  return SHOWCASE_MONTHLY_QUOTA - getShowcaseBillableUnits(events);
}

export const SHOWCASE_TOUR_RUN_ID = 'run_a1b2c3d4';

export function getShowcasePlaygroundResponse(occurredAt: string): string {
  return `{
  "id": "${SHOWCASE_TOUR_RUN_ID}",
  "status": "completed",
  "created_at": "${occurredAt}"
}`;
}

export function createTourUsageEvent(occurredAt: string): ShowcaseUsageEvent {
  return {
    occurredAt,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 200,
    latencyMs: 142,
  };
}

interface ShowcaseUsageEventMinutesAgoTemplate {
  readonly kind: 'minutesAgo';
  readonly minutesAgo: number;
  readonly endpoint: string;
  readonly eventType: 'api_call';
  readonly quantity: number;
  readonly httpStatus: number;
  readonly latencyMs: number;
}

interface ShowcaseUsageEventDayTimeTemplate {
  readonly kind: 'dayTime';
  readonly dayOffset: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly endpoint: string;
  readonly eventType: 'api_call';
  readonly quantity: number;
  readonly httpStatus: number;
  readonly latencyMs: number;
}

type ShowcaseUsageEventTemplate =
  | ShowcaseUsageEventMinutesAgoTemplate
  | ShowcaseUsageEventDayTimeTemplate;

const SHOWCASE_USAGE_EVENT_TEMPLATES: readonly ShowcaseUsageEventTemplate[] = [
  {
    kind: 'minutesAgo',
    minutesAgo: 195,
    endpoint: 'GET /v1/health',
    eventType: 'api_call',
    quantity: 0,
    httpStatus: 200,
    latencyMs: 34,
  },
  {
    kind: 'minutesAgo',
    minutesAgo: 138,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 201,
    latencyMs: 156,
  },
  {
    kind: 'minutesAgo',
    minutesAgo: 97,
    endpoint: 'GET /v1/runs/run_a1b2',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 200,
    latencyMs: 89,
  },
  {
    kind: 'dayTime',
    dayOffset: 1,
    hour: 16,
    minute: 20,
    second: 0,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 200,
    latencyMs: 128,
  },
  {
    kind: 'dayTime',
    dayOffset: 1,
    hour: 9,
    minute: 45,
    second: 0,
    endpoint: 'GET /v1/health',
    eventType: 'api_call',
    quantity: 0,
    httpStatus: 200,
    latencyMs: 31,
  },
  {
    kind: 'dayTime',
    dayOffset: 2,
    hour: 11,
    minute: 30,
    second: 0,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 201,
    latencyMs: 145,
  },
  {
    kind: 'dayTime',
    dayOffset: 3,
    hour: 15,
    minute: 10,
    second: 0,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 200,
    latencyMs: 132,
  },
  {
    kind: 'dayTime',
    dayOffset: 3,
    hour: 8,
    minute: 22,
    second: 0,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 200,
    latencyMs: 118,
  },
  {
    kind: 'dayTime',
    dayOffset: 4,
    hour: 14,
    minute: 0,
    second: 0,
    endpoint: 'GET /v1/health',
    eventType: 'api_call',
    quantity: 0,
    httpStatus: 200,
    latencyMs: 29,
  },
  {
    kind: 'dayTime',
    dayOffset: 5,
    hour: 17,
    minute: 40,
    second: 0,
    endpoint: 'GET /v1/runs/run_m8n1',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 200,
    latencyMs: 95,
  },
  {
    kind: 'dayTime',
    dayOffset: 5,
    hour: 10,
    minute: 15,
    second: 0,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 200,
    latencyMs: 151,
  },
  {
    kind: 'dayTime',
    dayOffset: 6,
    hour: 13,
    minute: 5,
    second: 0,
    endpoint: 'POST /v1/runs',
    eventType: 'api_call',
    quantity: 1,
    httpStatus: 201,
    latencyMs: 139,
  },
];

export function resolveShowcaseUsageEvents(
  now = new Date(),
): readonly ShowcaseUsageEvent[] {
  const manual = SHOWCASE_USAGE_EVENT_TEMPLATES.map((template) =>
    materializeUsageEventTemplate(template, now),
  );
  const synthetic = buildSyntheticTodayUsageEvents(now);
  return [...manual, ...synthetic];
}

function buildSyntheticTodayUsageEvents(now: Date): ShowcaseUsageEvent[] {
  const specs: readonly {
    readonly endpoint: string;
    readonly quantity: number;
    readonly httpStatus: number;
    readonly latencyMs: number;
  }[] = [
    { endpoint: 'POST /v1/runs', quantity: 1, httpStatus: 200, latencyMs: 142 },
    { endpoint: 'POST /v1/runs', quantity: 1, httpStatus: 201, latencyMs: 156 },
    { endpoint: 'GET /v1/runs/run_a1b2', quantity: 1, httpStatus: 200, latencyMs: 89 },
    { endpoint: 'GET /v1/runs/run_m8n1', quantity: 1, httpStatus: 200, latencyMs: 95 },
    { endpoint: 'GET /v1/runs/run_k3p9', quantity: 1, httpStatus: 200, latencyMs: 102 },
    { endpoint: 'GET /v1/health', quantity: 0, httpStatus: 200, latencyMs: 34 },
    { endpoint: 'POST /v1/runs', quantity: 1, httpStatus: 200, latencyMs: 128 },
    { endpoint: 'POST /v1/runs', quantity: 1, httpStatus: 200, latencyMs: 151 },
  ];

  const maxMinute = now.getHours() * 60 + now.getMinutes() - 8;
  if (maxMinute < 60) {
    return [];
  }

  /** Minute-of-day bursts — quiet gaps between clusters create chart rhythm. */
  const bursts: readonly { readonly start: number; readonly count: number }[] = [
    { start: 95, count: 2 },
    { start: 6 * 60 + 20, count: 3 },
    { start: 8 * 60 + 10, count: 4 },
    { start: 9 * 60, count: 7 },
    { start: 9 * 60 + 35, count: 6 },
    { start: 10 * 60 + 5, count: 5 },
    { start: 10 * 60 + 40, count: 4 },
    { start: 11 * 60 + 15, count: 2 },
    { start: 13 * 60 + 45, count: 3 },
    { start: 14 * 60 + 30, count: 5 },
    { start: 15 * 60 + 10, count: 4 },
    { start: 16 * 60, count: 3 },
  ];

  const events: ShowcaseUsageEvent[] = [];
  let specIndex = 0;

  for (const burst of bursts) {
    if (burst.start >= maxMinute) {
      continue;
    }

    for (let index = 0; index < burst.count; index += 1) {
      const minute = burst.start + Math.floor((index / burst.count) * 22) + (index % 4);
      if (minute >= maxMinute) {
        break;
      }

      const spec = specs[specIndex % specs.length]!;
      const second = (minute * 13 + index * 17) % 60;
      events.push({
        occurredAt: resolveTodayMinute(minute, second, now),
        endpoint: spec.endpoint,
        eventType: 'api_call',
        quantity: spec.quantity,
        httpStatus: spec.httpStatus,
        latencyMs: spec.latencyMs + ((minute + index) % 17) - 8,
      });
      specIndex += 1;
    }
  }

  return events;
}

function resolveTodayMinute(
  minute: number,
  second: number,
  now: Date,
): string {
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Math.floor(minute / 60),
    minute % 60,
    second,
    0,
  );
  return date.toISOString();
}

function materializeUsageEventTemplate(
  template: ShowcaseUsageEventTemplate,
  now: Date,
): ShowcaseUsageEvent {
  const occurredAt =
    template.kind === 'minutesAgo'
      ? resolveMinutesAgo(template.minutesAgo, now)
      : resolveDayTime(
          template.dayOffset,
          template.hour,
          template.minute,
          template.second,
          now,
        );

  return {
    occurredAt,
    endpoint: template.endpoint,
    eventType: template.eventType,
    quantity: template.quantity,
    httpStatus: template.httpStatus,
    latencyMs: template.latencyMs,
  };
}

function resolveMinutesAgo(minutesAgo: number, now: Date): string {
  const date = new Date(now);
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() - minutesAgo);
  return date.toISOString();
}

function resolveDayTime(
  dayOffset: number,
  hour: number,
  minute: number,
  second: number,
  now: Date,
): string {
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - dayOffset,
    hour,
    minute,
    second,
    0,
  );
  return date.toISOString();
}

function getLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMinutesSinceMidnight(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export interface ShowcaseUsageChartPoint {
  readonly label: string;
  readonly value: number;
}

export type ShowcaseUsageChartFormat = 'currency' | 'count';

export interface ShowcaseUsageMetricChart {
  readonly title: string;
  readonly total: number;
  readonly format: ShowcaseUsageChartFormat;
  readonly color: string;
  readonly points: readonly ShowcaseUsageChartPoint[];
}

/** Chart resolution: one bucket per N minutes from midnight to now. */
export const SHOWCASE_USAGE_CHART_BUCKET_MINUTES = 30;

export interface ShowcaseUsageCharts {
  readonly spend: ShowcaseUsageMetricChart;
  readonly requests: ShowcaseUsageMetricChart;
}

/** Vercel AI gateway–style chart palette. */
export const SHOWCASE_USAGE_CHART_COLORS = {
  green: '#2ea043',
  red: '#f85149',
  orange: '#f0883e',
  pink: '#c2185b',
  purple: '#a371f7',
} as const;

/** Billable unit price — spend chart derives from event quantity. */
export const SHOWCASE_API_UNIT_PRICE = 0.03;

function formatShowcaseUsageTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export function toShowcaseUsageRow(event: ShowcaseUsageEvent): ShowcaseUsageRow {
  return {
    time: formatShowcaseUsageTime(event.occurredAt),
    endpoint: event.endpoint,
    eventType: event.eventType,
    quantity: event.quantity,
    httpStatus: event.httpStatus,
    latencyMs: event.latencyMs,
  };
}

export function getShowcaseTodayUsageSummary(
  events: readonly ShowcaseUsageEvent[],
  now = new Date(),
): {
  readonly requestCount: number;
  readonly billableUnits: number;
  readonly spend: number;
} {
  const todayKey = getLocalDayKey(now);
  const todayEvents = events.filter(
    (event) => getLocalDayKey(new Date(event.occurredAt)) === todayKey,
  );
  const billableUnits = todayEvents.reduce(
    (sum, event) => sum + event.quantity,
    0,
  );

  return {
    requestCount: todayEvents.length,
    billableUnits,
    spend: roundCurrency(billableUnits * SHOWCASE_API_UNIT_PRICE),
  };
}

export function buildShowcaseUsageCharts(
  events: readonly ShowcaseUsageEvent[],
  now = new Date(),
): ShowcaseUsageCharts {
  const todayKey = getLocalDayKey(now);
  const todayEvents = events.filter(
    (event) => getLocalDayKey(new Date(event.occurredAt)) === todayKey,
  );
  const minutesSinceMidnight = Math.max(
    1,
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60,
  );
  const bucketCount = Math.max(
    1,
    Math.ceil(minutesSinceMidnight / SHOWCASE_USAGE_CHART_BUCKET_MINUTES),
  );

  const requestBuckets = Array.from({ length: bucketCount }, () => 0);
  const spendBuckets = Array.from({ length: bucketCount }, () => 0);

  for (const event of todayEvents) {
    const eventMinute = getMinutesSinceMidnight(event.occurredAt);
    const bucket = Math.min(
      bucketCount - 1,
      Math.floor(eventMinute / SHOWCASE_USAGE_CHART_BUCKET_MINUTES),
    );
    requestBuckets[bucket] += 1;
    spendBuckets[bucket] = roundCurrency(
      spendBuckets[bucket] + event.quantity * SHOWCASE_API_UNIT_PRICE,
    );
  }

  const smoothedRequests = smoothChartBuckets(requestBuckets, 3);
  const smoothedSpend = smoothChartBuckets(spendBuckets, 3).map((value) =>
    roundCurrency(value),
  );

  const requestPoints: ShowcaseUsageChartPoint[] = smoothedRequests.map(
    (value, index) => ({
      label:
        index === 0
          ? '12am'
          : index === bucketCount - 1
            ? 'Now'
            : '',
      value,
    }),
  );
  const spendPoints: ShowcaseUsageChartPoint[] = smoothedSpend.map(
    (value, index) => ({
      label:
        index === 0
          ? '12am'
          : index === bucketCount - 1
            ? 'Now'
            : '',
      value,
    }),
  );

  const summary = getShowcaseTodayUsageSummary(events, now);

  return {
    spend: {
      title: 'Spend',
      total: summary.spend,
      format: 'currency',
      color: SHOWCASE_USAGE_CHART_COLORS.pink,
      points: spendPoints,
    },
    requests: {
      title: 'Requests',
      total: summary.requestCount,
      format: 'count',
      color: SHOWCASE_USAGE_CHART_COLORS.green,
      points: requestPoints,
    },
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Rolling average — softens spikes while keeping peaks and quiet valleys. */
function smoothChartBuckets(values: readonly number[], window: number): number[] {
  if (window <= 1 || values.length <= 2) {
    return [...values];
  }

  const radius = Math.floor(window / 2);
  return values.map((_, index) => {
    let sum = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const sample = values[index + offset];
      if (sample === undefined) {
        continue;
      }
      sum += sample;
      count += 1;
    }
    return count === 0 ? 0 : sum / count;
  });
}

export function getShowcaseUsageEvents(
  includeTourRequest: boolean,
  tourOccurredAt: string | null = null,
  now = new Date(),
): readonly ShowcaseUsageEvent[] {
  const base = resolveShowcaseUsageEvents(now);
  if (!includeTourRequest || !tourOccurredAt) {
    return base;
  }

  return [createTourUsageEvent(tourOccurredAt), ...base];
}

export function getShowcaseUsageRows(
  includeTourRequest: boolean,
  tourOccurredAt: string | null = null,
  now = new Date(),
): readonly ShowcaseUsageRow[] {
  const todayKey = getLocalDayKey(now);
  return [...getShowcaseUsageEvents(includeTourRequest, tourOccurredAt, now)]
    .filter(
      (event) => getLocalDayKey(new Date(event.occurredAt)) === todayKey,
    )
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 8)
    .map(toShowcaseUsageRow);
}
