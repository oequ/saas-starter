import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideExternalLink } from '@ng-icons/lucide';
import { billingMeterUsagePercent, billingPeriodLabel, billingSeatUsagePercent, formatPlanLabel, formatSeatUsageValue, formatUsageMeterValue, formatUsageNumber, resolveCurrentPlanId, type BillingSummary, type UsageMeter } from '@oequ/ports';
import { BILLING_PORT } from '@oequ/ports-angular';
import {
  TranslocoPipe,
  TranslocoService,
  portErrorToError,
} from '@oequ/i18n';
import { PaywallDialogService } from '@oequ/shell';
import { provideBrnTooltipDefaultOptions, BrnTooltip } from '@spartan-ng/brain/tooltip';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import {
  DEFAULT_TOOLTIP_CONTENT_CLASSES,
  DEFAULT_TOOLTIP_SVG_CLASS,
  tooltipPositionVariants,
} from '@spartan-ng/helm/tooltip';
import { hlm } from '@spartan-ng/helm/utils';

import { UsageMeterRingComponent } from './usage-meter-ring.component';
import { UsagePageSkeletonComponent } from './usage-page-skeleton.component';

const USAGE_TOOLTIP_CONTENT_CLASSES = DEFAULT_TOOLTIP_CONTENT_CLASSES.replace(
  'w-fit',
  'max-w-xs text-left leading-snug',
).replace('text-balance', '');

@Directive({
  selector: '[oequUsageTooltip]',
  providers: [
    provideBrnTooltipDefaultOptions({
      svgClasses: DEFAULT_TOOLTIP_SVG_CLASS,
      tooltipContentClasses: USAGE_TOOLTIP_CONTENT_CLASSES,
      arrowClasses: (position) => hlm(tooltipPositionVariants({ position })),
    }),
  ],
  hostDirectives: [
    {
      directive: BrnTooltip,
      inputs: [
        'brnTooltip: oequUsageTooltip',
        'position',
        'hideDelay',
        'showDelay',
        'tooltipDisabled',
      ],
    },
  ],
})
export class OequUsageTooltipDirective {}

interface UsageDisplayRow {
  readonly id: string;
  readonly name: string;
  readonly value: string;
  readonly percent: number | null;
  readonly available: boolean;
  readonly detailTooltip: string;
}

const PREMIUM_DEMO_METERS = [
  {
    metricId: 'sso_users',
    nameKey: 'org.usage.premium.sso_users',
    unit: 'MAU',
    consumed: 0,
    limit: 100,
  },
  {
    metricId: 'storage_image_transformations',
    nameKey: 'org.usage.premium.storage_image_transformations',
    consumed: 0,
    limit: null as number | null,
  },
] as const;

@Component({
  selector: 'oequ-org-settings-usage',
  imports: [
    RouterLink,
    NgIcon,
    HlmCardImports,
    HlmButtonImports,
    HlmSelectImports,
    OequUsageTooltipDirective,
    UsageMeterRingComponent,
    UsagePageSkeletonComponent,
    TranslocoPipe,
  ],
  providers: [provideIcons({ lucideChevronRight, lucideExternalLink })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ 'org.usage.title' | transloco }}
        </h1>
        @if (statusMessage(); as message) {
          <p role="status" class="text-muted-foreground mt-3 text-sm">{{ message }}</p>
        }
      </div>

      <section hlmCard variant="outline" class="gap-0 overflow-hidden py-0">
        <div hlmCardContent class="!p-0">
          @if (billingResource.isLoading()) {
            <oequ-usage-page-skeleton
              aria-busy="true"
              [attr.aria-label]="'org.usage.loading' | transloco"
            />
          } @else if (billingResource.error(); as err) {
            <p class="text-destructive p-6 text-sm">{{ err.message }}</p>
          } @else if (summary(); as billing) {
            <div
              class="border-border flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <hlm-select class="w-full sm:w-[220px]" [disabled]="true">
                <hlm-select-trigger class="h-9 shadow-none">
                  <span>{{ 'org.usage.billingCycle' | transloco }}</span>
                </hlm-select-trigger>
                <hlm-select-content *hlmSelectPortal>
                  <hlm-select-item value="current">{{
                    'org.usage.billingCycle' | transloco
                  }}</hlm-select-item>
                </hlm-select-content>
              </hlm-select>

              <p class="text-muted-foreground text-sm">
                {{
                  'org.usage.orgOnPlan'
                    | transloco: {
                        plan: planDisplayLabel(billing),
                        period: billingPeriodLabel(billing),
                      }
                }}
              </p>
            </div>

            <div class="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <aside class="space-y-6">
                <div>
                  <h2 class="text-xl font-semibold tracking-tight">
                    {{ 'org.usage.summary.title' | transloco }}
                  </h2>
                  <p class="text-muted-foreground mt-3 text-sm leading-6">
                    {{ 'org.usage.summary.lead' | transloco }}
                  </p>
                </div>

                <div>
                  <p
                    class="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase"
                  >
                    {{ 'org.usage.moreInfo' | transloco }}
                  </p>
                  <ul class="space-y-2 text-sm">
                    <li>
                      <a
                        class="hover:text-foreground inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                        routerLink="/workspace/settings/billing"
                      >
                        {{ 'org.usage.howBillingWorks' | transloco }}
                        <ng-icon name="lucideExternalLink" class="size-3.5" />
                      </a>
                    </li>
                    <li>
                      <button
                        type="button"
                        class="hover:text-foreground inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                        (click)="openUpgradeDialog()"
                      >
                        {{ 'org.usage.plansPricing' | transloco }}
                        <ng-icon name="lucideExternalLink" class="size-3.5" />
                      </button>
                    </li>
                  </ul>
                </div>
              </aside>

              <div class="grid gap-x-8 gap-y-0 sm:grid-cols-2">
                @for (row of usageRows(billing); track row.id) {
                  <div
                    class="border-border flex items-start justify-between gap-4 border-b py-4 last:border-b-0"
                  >
                    <div class="min-w-0 space-y-1">
                      <button
                        type="button"
                        class="hover:text-foreground inline-flex items-center gap-1 text-left text-sm font-medium"
                        [oequUsageTooltip]="row.detailTooltip"
                        position="top"
                        [attr.aria-label]="usageRowAria(row.name)"
                      >
                        {{ row.name }}
                        <ng-icon
                          name="lucideChevronRight"
                          class="text-muted-foreground size-3.5"
                          aria-hidden="true"
                        />
                      </button>
                      <p
                        class="text-sm font-semibold"
                        [class.text-muted-foreground]="!row.available"
                      >
                        {{ row.value }}
                      </p>
                    </div>

                    @if (row.available) {
                      <oequ-usage-meter-ring
                        class="mt-0.5 shrink-0"
                        [percent]="row.percent"
                      />
                    } @else {
                      <button
                        hlmBtn
                        type="button"
                        size="sm"
                        class="shrink-0"
                        (click)="openUpgradeDialog()"
                      >
                        {{ 'org.usage.upgrade' | transloco }}
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            <p class="text-muted-foreground p-6 text-sm">
              {{ 'org.usage.unavailable' | transloco }}
            </p>
          }
        </div>
      </section>
    </div>
  `,
})
export class OrgSettingsUsageComponent {
  readonly organizationId = input.required<string>();

  private readonly billingPort = inject(BILLING_PORT);
  private readonly paywallDialog = inject(PaywallDialogService);
  private readonly transloco = inject(TranslocoService);

  protected readonly billingPeriodLabel = billingPeriodLabel;
  protected readonly statusMessage = signal<string | null>(null);

  protected readonly billingResource = resource({
    params: () => ({ orgId: this.organizationId() }),
    loader: async ({ params, abortSignal }) => {
      const result = await this.billingPort.getSummary(
        params.orgId,
        abortSignal,
      );
      if (!result.ok) {
        throw portErrorToError(result.error, this.transloco);
      }
      return result.data;
    },
  });

  protected readonly summary = computed(() => this.billingResource.value());

  protected planDisplayLabel(summary: BillingSummary): string {
    return this.transloco.translate('org.billing.subscription.planDisplay', {
      plan: formatPlanLabel(summary.planId, summary.planName),
    });
  }

  protected meterDisplayName(metricId: string, fallback: string): string {
    const key = `org.usage.meters.${metricId}`;
    const translated = this.transloco.translate(key);
    return translated === key ? fallback : translated;
  }

  protected usageRowAria(name: string): string {
    return this.transloco.translate('org.usage.rowAria', { name });
  }

  protected usageRows(summary: BillingSummary): readonly UsageDisplayRow[] {
    const seatsRow: UsageDisplayRow = {
      id: 'seats',
      name: this.transloco.translate('org.usage.seats'),
      value: formatSeatUsageValue(summary),
      percent: billingSeatUsagePercent(summary),
      available: true,
      detailTooltip: this.translateUsageTooltip('seats', summary),
    };

    const meterRows = summary.meters.map((meter) =>
      this.toUsageDisplayRow(meter, summary),
    );

    return [seatsRow, ...meterRows, ...this.premiumUsageRows(summary)];
  }

  private premiumUsageRows(summary: BillingSummary): readonly UsageDisplayRow[] {
    const available = resolveCurrentPlanId(summary) === 'team';

    return PREMIUM_DEMO_METERS.map((definition) =>
      this.toUsageDisplayRow(
        {
          metricId: definition.metricId,
          name: this.transloco.translate(definition.nameKey),
          consumed: definition.consumed,
          limit: available ? definition.limit : null,
          available,
          unit: 'unit' in definition ? definition.unit : undefined,
        },
        summary,
      ),
    );
  }

  protected async openUpgradeDialog(): Promise<void> {
    this.statusMessage.set(null);
    const result = await this.paywallDialog.requestOpen();
    if (result === 'success') {
      this.billingResource.reload();
      this.statusMessage.set(
        this.transloco.translate('org.usage.planUpgraded'),
      );
    }
  }

  private toUsageDisplayRow(
    meter: UsageMeter,
    summary: BillingSummary,
  ): UsageDisplayRow {
    return {
      id: meter.metricId,
      name: this.meterDisplayName(meter.metricId, meter.name),
      value: formatUsageMeterValue(meter),
      percent: billingMeterUsagePercent(meter),
      available: meter.available,
      detailTooltip: this.translateUsageTooltip(meter.metricId, summary, {
        available: meter.available,
        limit: meter.limit,
        unit: meter.unit,
      }),
    };
  }

  private translateUsageTooltip(
    metricId: string,
    summary: BillingSummary,
    options: {
      readonly available?: boolean;
      readonly limit?: number | null;
      readonly unit?: string;
    } = {},
  ): string {
    const planName = formatPlanLabel(summary.planId, summary.planName);
    const available = options.available ?? true;

    if (!available) {
      switch (metricId) {
        case 'sso_users':
          return this.transloco.translate('org.usage.tooltips.ssoUsersLocked');
        case 'storage_image_transformations':
          return this.transloco.translate(
            'org.usage.tooltips.imageTransformsLocked',
          );
        default:
          return this.transloco.translate('org.usage.tooltips.notIncluded');
      }
    }

    const limit = this.formatIncludedLimit(options.limit, options.unit);

    switch (metricId) {
      case 'seats':
        return this.transloco.translate('org.usage.tooltips.seats', {
          planName,
          limit,
        });
      case 'emails_sent':
        if (resolveCurrentPlanId(summary) === 'free') {
          return this.transloco.translate('org.usage.tooltips.emailsFree', {
            planName,
          });
        }
        return this.transloco.translate('org.usage.tooltips.emails', {
          planName,
          limit,
        });
      case 'api_requests':
        return this.transloco.translate('org.usage.tooltips.apiRequests', {
          planName,
          limit,
        });
      case 'webhook_deliveries':
        return this.transloco.translate('org.usage.tooltips.webhookDeliveries', {
          planName,
          limit,
        });
      case 'storage_size':
        return this.transloco.translate('org.usage.tooltips.storage', {
          planName,
          limit,
        });
      case 'sso_users':
        return this.transloco.translate('org.usage.tooltips.ssoUsers', {
          planName,
          limit,
        });
      case 'storage_image_transformations':
        return this.transloco.translate('org.usage.tooltips.imageTransforms', {
          planName,
          limit,
        });
      default:
        return this.transloco.translate('org.usage.tooltips.default', {
          planName,
          limit,
        });
    }
  }

  private formatIncludedLimit(
    limit: number | null | undefined,
    unit?: string,
  ): string {
    if (limit === null || limit === undefined) {
      return unit
        ? this.transloco.translate('org.usage.limits.unlimitedWithUnit', {
            unit,
          })
        : this.transloco.translate('org.usage.limits.unlimitedUsage');
    }
    const formatted = formatUsageNumber(limit);
    return unit ? `${formatted} ${unit}` : formatted;
  }
}
