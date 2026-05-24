import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import {
  BILLING_PORT,
  COMMERCIAL_PLAN_IDS,
  STRIPE_BILLING_ENABLED,
  comparePlanTiers,
  formatUsageNumber,
  getDowngradeBlocker,
  ORG_PORT,
  resolveCurrentPlanId,
  type BillingPlan,
  type BillingSummary,
  type CommercialPlanId,
} from '@oequ/ports';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import {
  TranslocoPipe,
  TranslocoService,
  translatePortError,
} from '@oequ/i18n';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

import {
  PAYWALL_DIALOG_BODY_CLASS,
  PAYWALL_DIALOG_CONTENT_CLASS,
} from '../settings-layout.tokens';
import { PlanDowngradeConfirmDialogComponent } from './plan-downgrade-confirm-dialog.component';
import { PlanUpgradeCheckoutDialogComponent } from './plan-upgrade-checkout-dialog.component';
import { PaywallDialogService } from './paywall-dialog.service';

type PlanAction = 'current' | 'upgrade' | 'downgrade' | 'none';

@Component({
  selector: 'oequ-paywall-dialog',
  imports: [
    CurrencyPipe,
    NgIcon,
    HlmDialogImports,
    HlmButtonImports,
    HlmBadgeImports,
    HlmCardImports,
    HlmSkeletonImports,
    PlanDowngradeConfirmDialogComponent,
    PlanUpgradeCheckoutDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideCheck })],
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
            <hlm-dialog-header class="shrink-0 space-y-1 text-start">
              <h3 hlmDialogTitle class="text-xl">
                {{ 'paywall.dialog.title' | transloco }}
              </h3>
              <p hlmDialogDescription>
                {{ 'paywall.dialog.description' | transloco }}
              </p>
            </hlm-dialog-header>

            <div [class]="paywallBodyClass">
            @if (loading()) {
              <div
                class="grid gap-4 py-2 md:grid-cols-3"
                aria-busy="true"
                [attr.aria-label]="'paywall.dialog.loadingPlans' | transloco"
              >
                @for (_ of planSkeletonSlots; track $index) {
                  <div
                    class="border-border flex flex-col gap-4 rounded-xl border p-5"
                  >
                    <div class="flex items-center gap-2">
                      <hlm-skeleton class="h-4 w-12" />
                      <hlm-skeleton class="h-5 w-20 rounded-full" />
                    </div>
                    <hlm-skeleton class="h-8 w-28" />
                    <hlm-skeleton class="h-10 w-full rounded-md" />
                    <div class="space-y-2.5">
                      @for (line of featureSkeletonSlots; track $index) {
                        <div class="flex items-center gap-2">
                          <hlm-skeleton class="size-4 shrink-0 rounded-sm" />
                          <hlm-skeleton class="h-3.5 flex-1" />
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else if (loadError(); as error) {
              <p class="text-destructive py-6 text-sm" role="alert">{{ error }}</p>
            } @else {
              @if (
                !downgradeConfirmOpen() && downgradeError();
                as downgradeMessage
              ) {
                <p class="text-destructive mb-4 text-sm" role="alert">
                  {{ downgradeMessage }}
                </p>
              }
              <div class="grid gap-4 py-2 md:grid-cols-3">
                @for (plan of orderedPlans(); track plan.id) {
                  <article
                    hlmCard
                    variant="outline"
                    class="flex flex-col gap-0 overflow-hidden py-0"
                    [class.ring-primary/40]="isSuggestedPlan(plan.id)"
                    [class.ring-2]="isSuggestedPlan(plan.id)"
                  >
                    <div hlmCardContent class="flex flex-1 flex-col !p-5">
                      <div class="mb-3 flex flex-wrap items-center gap-2">
                        <h4
                          class="text-primary text-sm font-semibold tracking-wide uppercase"
                        >
                          {{ planNameKey(plan.id) | transloco }}
                        </h4>
                        @if (planAction(plan.id) === 'current') {
                          <span
                            hlmBadge
                            variant="secondary"
                            class="text-xs font-normal"
                          >
                            {{ 'paywall.dialog.currentPlan' | transloco }}
                          </span>
                        } @else if (plan.id === 'pro') {
                          <span
                            hlmBadge
                            variant="outline"
                            class="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 text-xs font-normal dark:text-emerald-400"
                          >
                            {{ 'paywall.dialog.mostPopular' | transloco }}
                          </span>
                        }
                      </div>

                      <p class="text-2xl font-semibold tracking-tight">
                        @if (plan.priceAmount === 0) {
                          $0.00
                        } @else if (plan.isPerSeat) {
                          {{ 'paywall.dialog.from' | transloco }}
                          {{
                            plan.priceAmount
                              | currency: plan.priceCurrency : 'symbol' : '1.0-0'
                          }}
                        } @else {
                          {{
                            plan.priceAmount
                              | currency: plan.priceCurrency : 'symbol' : '1.0-0'
                          }}
                        }
                        <span class="text-muted-foreground text-sm font-normal">
                          {{ 'paywall.dialog.perMonth' | transloco }}
                        </span>
                      </p>

                      <div class="mt-4">
                        @if (planAction(plan.id) === 'current') {
                          <button
                            hlmBtn
                            type="button"
                            variant="outline"
                            class="w-full"
                            disabled
                          >
                            {{ 'paywall.dialog.currentPlan' | transloco }}
                          </button>
                        } @else if (planAction(plan.id) === 'upgrade') {
                          <button
                            hlmBtn
                            type="button"
                            class="w-full"
                            (click)="startUpgrade(plan)"
                          >
                            {{
                              'paywall.dialog.upgradeTo'
                                | transloco: {
                                    plan: (planNameKey(plan.id) | transloco),
                                  }
                            }}
                          </button>
                        } @else if (planAction(plan.id) === 'downgrade') {
                          <button
                            hlmBtn
                            type="button"
                            variant="outline"
                            class="w-full"
                            (click)="startDowngrade(plan)"
                          >
                            {{
                              'paywall.dialog.downgradeTo'
                                | transloco: {
                                    plan: (planNameKey(plan.id) | transloco),
                                  }
                            }}
                          </button>
                        }
                      </div>

                      <ul class="mt-5 space-y-2.5">
                        @for (feature of plan.features; track feature.id) {
                          @if (feature.included) {
                            <li class="flex items-start gap-2 text-sm">
                              <ng-icon
                                name="lucideCheck"
                                class="text-emerald-600 dark:text-emerald-400 mt-0.5 size-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span class="text-muted-foreground leading-snug">{{
                                planFeatureKey(plan.id, feature.id) | transloco
                              }}</span>
                            </li>
                          }
                        }
                      </ul>

                      @if (plan.id === 'free') {
                        <p
                          class="text-muted-foreground mt-auto pt-4 text-xs leading-relaxed"
                        >
                          {{ 'paywall.dialog.freeFootnote' | transloco }}
                        </p>
                      }
                    </div>
                  </article>
                }
              </div>
            }
            </div>
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>

    <oequ-plan-upgrade-checkout-dialog
      [open]="checkoutConfirmOpen()"
      [planId]="selectedPlanId() ?? 'free'"
      [loading]="checkoutLoading()"
      [confirming]="checkoutConfirming()"
      [error]="checkoutConfirmError()"
      (confirmed)="confirmMockCheckout()"
      (cancelled)="closeCheckoutConfirm()"
    />

    <oequ-plan-downgrade-confirm-dialog
      [open]="downgradeConfirmOpen()"
      [planId]="selectedPlanId() ?? 'free'"
      [confirming]="downgradeConfirming()"
      [error]="downgradeConfirmError()"
      (confirmed)="confirmDowngrade()"
      (cancelled)="closeDowngradeConfirm()"
    />
  `,
})
export class PaywallDialogComponent {
  private readonly dialogService = inject(PaywallDialogService);
  private readonly billingPort = inject(BILLING_PORT);
  private readonly orgPort = inject(ORG_PORT);
  private readonly transloco = inject(TranslocoService);
  private readonly stripeBillingEnabled = inject(STRIPE_BILLING_ENABLED);

  protected readonly planSkeletonSlots = [0, 1, 2] as const;
  protected readonly featureSkeletonSlots = [0, 1, 2, 3, 4] as const;

  protected readonly paywallBodyClass = PAYWALL_DIALOG_BODY_CLASS;

  protected readonly dialogContentClass = PAYWALL_DIALOG_CONTENT_CLASS;

  protected readonly dialogState = computed(() =>
    this.dialogService.open() ? 'open' : 'closed',
  );

  private readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly plans = signal<readonly BillingPlan[]>([]);
  protected readonly currentPlanId = signal<CommercialPlanId>('free');
  protected readonly billingSummary = signal<BillingSummary | null>(null);
  protected readonly selectedPlanId = signal<CommercialPlanId | null>(null);
  protected readonly checkoutConfirmOpen = signal(false);
  protected readonly checkoutLoading = signal(false);
  protected readonly checkoutConfirming = signal(false);
  protected readonly checkoutConfirmError = signal<string | null>(null);
  protected readonly downgradeConfirmOpen = signal(false);
  protected readonly downgradeError = signal<string | null>(null);
  protected readonly downgradeConfirmError = signal<string | null>(null);
  protected readonly downgradeConfirming = signal(false);

  protected readonly orderedPlans = computed(() => {
    const byId = new Map(this.plans().map((plan) => [plan.id, plan]));
    return COMMERCIAL_PLAN_IDS.map((id) => byId.get(id)).filter(
      (plan): plan is BillingPlan => plan !== undefined,
    );
  });

  protected readonly selectedPlan = computed(() => {
    const id = this.selectedPlanId();
    return id ? (this.plans().find((plan) => plan.id === id) ?? null) : null;
  });

  constructor() {
    effect(() => {
      if (!this.dialogService.open()) {
        untracked(() => this.resetState());
        return;
      }
      untracked(() => void this.loadPaywallData());
    });
  }

  protected planAction(planId: string): PlanAction {
    const current = this.currentPlanId();
    const tier = planId as CommercialPlanId;
    if (tier === current) {
      return 'current';
    }
    if (comparePlanTiers(tier, current) > 0) {
      return 'upgrade';
    }
    if (comparePlanTiers(tier, current) < 0) {
      return 'downgrade';
    }
    return 'none';
  }

  protected isSuggestedPlan(planId: string): boolean {
    return this.dialogService.suggestedPlanId() === planId;
  }

  protected planNameKey(planId: string): string {
    return `paywall.plans.${planId}.name`;
  }

  protected planFeatureKey(planId: string, featureId: string): string {
    return `paywall.plans.${planId}.features.${featureId}`;
  }

  protected async startUpgrade(plan: BillingPlan): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      this.loadError.set(
        this.transloco.translate('paywall.errors.noWorkspace'),
      );
      return;
    }

    this.downgradeConfirmOpen.set(false);
    this.selectedPlanId.set(plan.id as CommercialPlanId);
    this.checkoutConfirmOpen.set(true);
    this.checkoutLoading.set(true);
    this.checkoutConfirmError.set(null);

    const seatFeature = plan.features.find((feature) => feature.id === 'seats');
    const result = await this.billingPort.createCheckoutSession(
      org.id,
      plan.id,
      seatFeature?.limit ?? 10,
    );
    this.checkoutLoading.set(false);

    if (!result.ok) {
      this.checkoutConfirmError.set(translatePortError(result.error, this.transloco));
      this.checkoutConfirmOpen.set(true);
      return;
    }

    if (result.data.url) {
      globalThis.location.assign(result.data.url);
      return;
    }

    this.checkoutConfirmOpen.set(true);
  }

  protected closeCheckoutConfirm(): void {
    if (this.checkoutConfirming()) {
      return;
    }
    this.checkoutConfirmOpen.set(false);
    this.selectedPlanId.set(null);
    this.checkoutLoading.set(false);
    this.checkoutConfirmError.set(null);
  }

  protected startDowngrade(plan: BillingPlan): void {
    const summary = this.billingSummary();
    if (!summary) {
      this.loadError.set(
        this.transloco.translate('paywall.errors.billingUnavailable'),
      );
      return;
    }

    const blocker = getDowngradeBlocker(summary, plan.id, this.plans());
    if (blocker) {
      this.downgradeError.set(
        this.transloco.translate('paywall.errors.downgradeSeats', {
          used: formatUsageNumber(blocker.seatsUsed),
          limit: formatUsageNumber(blocker.seatLimit),
          plan: this.transloco.translate(this.planNameKey(blocker.targetPlanId)),
        }),
      );
      return;
    }

    this.checkoutConfirmOpen.set(false);
    this.downgradeError.set(null);
    this.downgradeConfirmError.set(null);
    this.selectedPlanId.set(plan.id as CommercialPlanId);
    this.downgradeConfirmOpen.set(true);
  }

  protected closeDowngradeConfirm(): void {
    if (this.downgradeConfirming()) {
      return;
    }
    this.downgradeConfirmOpen.set(false);
    this.selectedPlanId.set(null);
    this.downgradeConfirmError.set(null);
  }

  protected async confirmDowngrade(): Promise<void> {
    const org = this.activeOrganization();
    const plan = this.selectedPlan();
    if (!org || !plan) {
      return;
    }

    this.downgradeConfirming.set(true);
    this.downgradeConfirmError.set(null);

    if (this.stripeBillingEnabled) {
      const returnUrl = `${globalThis.location.origin}/workspace/settings/billing`;
      const portal = await this.billingPort.createPortalSession(org.id, returnUrl);
      this.downgradeConfirming.set(false);
      if (portal.ok && portal.data.url) {
        globalThis.location.assign(portal.data.url);
        return;
      }
      this.downgradeConfirmError.set(
        portal.ok
          ? this.transloco.translate('paywall.errors.portalUnavailable')
          : translatePortError(portal.error, this.transloco),
      );
      return;
    }

    const result = await this.billingPort.changePlan(org.id, plan.id);
    this.downgradeConfirming.set(false);

    if (result.ok) {
      this.downgradeConfirmOpen.set(false);
      this.dialogService.completeSuccess();
    } else {
      this.downgradeConfirmError.set(translatePortError(result.error, this.transloco));
    }
  }

  protected async confirmMockCheckout(): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      return;
    }

    this.checkoutConfirming.set(true);
    this.checkoutConfirmError.set(null);
    const result = await this.billingPort.confirmCheckout(org.id);
    this.checkoutConfirming.set(false);

    if (result.ok) {
      this.checkoutConfirmOpen.set(false);
      this.dialogService.completeSuccess();
    } else {
      this.checkoutConfirmError.set(translatePortError(result.error, this.transloco));
    }
  }

  protected onDialogClosed(): void {
    if (this.checkoutConfirming() || this.downgradeConfirming()) {
      return;
    }
    if (this.checkoutConfirmOpen()) {
      this.closeCheckoutConfirm();
      return;
    }
    if (this.downgradeConfirmOpen()) {
      this.closeDowngradeConfirm();
      return;
    }
    this.dialogService.close();
  }

  private async loadPaywallData(): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      this.loadError.set(
        this.transloco.translate('paywall.errors.noWorkspace'),
      );
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    const [plansResult, summaryResult] = await Promise.all([
      this.billingPort.listAvailablePlans(),
      this.billingPort.getSummary(org.id),
    ]);

    this.loading.set(false);

    if (!plansResult.ok) {
      this.loadError.set(translatePortError(plansResult.error, this.transloco));
      return;
    }
    if (!summaryResult.ok) {
      this.loadError.set(translatePortError(summaryResult.error, this.transloco));
      return;
    }

    this.plans.set(plansResult.data);
    this.billingSummary.set(summaryResult.data);
    this.currentPlanId.set(resolveCurrentPlanId(summaryResult.data));
  }

  private resetState(): void {
    this.loading.set(false);
    this.loadError.set(null);
    this.plans.set([]);
    this.billingSummary.set(null);
    this.currentPlanId.set('free');
    this.selectedPlanId.set(null);
    this.checkoutConfirmOpen.set(false);
    this.checkoutLoading.set(false);
    this.checkoutConfirming.set(false);
    this.checkoutConfirmError.set(null);
    this.downgradeConfirmOpen.set(false);
    this.downgradeError.set(null);
    this.downgradeConfirmError.set(null);
    this.downgradeConfirming.set(false);
  }
}
