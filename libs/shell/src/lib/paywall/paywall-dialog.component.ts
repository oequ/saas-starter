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
import { lucideArrowLeft, lucideCheck } from '@ng-icons/lucide';
import {
  BILLING_PORT,
  COMMERCIAL_PLAN_IDS,
  comparePlanTiers,
  ORG_PORT,
  resolveCurrentPlanId,
  type BillingPlan,
  type CommercialPlanId,
} from '@oequ/ports';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

import { PAYWALL_DIALOG_CONTENT_CLASS } from '../settings-layout.tokens';
import { PaywallDialogService } from './paywall-dialog.service';

type PaywallView = 'plans' | 'checkout';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideCheck, lucideArrowLeft })],
  template: `
    <hlm-dialog [state]="dialogState()" (closed)="onDialogClosed()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          @if (view() === 'checkout') {
            <hlm-dialog-header>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
                (click)="backToPlans()"
              >
                <ng-icon name="lucideArrowLeft" class="size-4" />
                Back
              </button>
              <h3 hlmDialogTitle>Upgrade to {{ selectedPlan()?.name }}</h3>
              <p hlmDialogDescription>
                Simulated checkout for the standalone demo. No card is charged.
              </p>
            </hlm-dialog-header>

            @if (checkoutLoading()) {
              <div class="space-y-4 py-2" aria-busy="true" aria-label="Initializing checkout">
                <hlm-skeleton class="h-4 w-full" />
                <hlm-skeleton class="h-4 w-5/6" />
                <hlm-skeleton class="mt-2 h-10 w-full rounded-md" />
              </div>
            } @else {
              <div class="space-y-4 py-2">
                <p class="text-sm leading-6">
                  By upgrading, you agree to the organizational Terms of Service.
                  Billed securely via our payment partner.
                </p>
                @if (checkoutError(); as error) {
                  <p class="text-destructive text-sm" role="alert">{{ error }}</p>
                }
                <button
                  hlmBtn
                  type="button"
                  class="w-full"
                  [disabled]="checkoutConfirming()"
                  (click)="confirmMockCheckout()"
                >
                  @if (checkoutConfirming()) {
                    Processing…
                  } @else {
                    Simulate payment success
                  }
                </button>
              </div>
            }
          } @else {
            <hlm-dialog-header class="space-y-1 text-start">
              <h3 hlmDialogTitle class="text-xl">Change subscription plan</h3>
              <p hlmDialogDescription>
                Compare tiers and upgrade when you need more seats or enterprise
                features.
              </p>
            </hlm-dialog-header>

            @if (loading()) {
              <div
                class="grid gap-4 py-2 md:grid-cols-3"
                aria-busy="true"
                aria-label="Loading plans"
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
                          {{ plan.name }}
                        </h4>
                        @if (planAction(plan.id) === 'current') {
                          <span
                            hlmBadge
                            variant="secondary"
                            class="text-xs font-normal"
                          >
                            Current plan
                          </span>
                        } @else if (plan.id === 'pro') {
                          <span
                            hlmBadge
                            variant="outline"
                            class="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 text-xs font-normal dark:text-emerald-400"
                          >
                            Most popular
                          </span>
                        }
                      </div>

                      <p class="text-2xl font-semibold tracking-tight">
                        @if (plan.priceAmount === 0) {
                          $0.00
                        } @else if (plan.isPerSeat) {
                          From
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
                          / month
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
                            Current plan
                          </button>
                        } @else if (planAction(plan.id) === 'upgrade') {
                          <button
                            hlmBtn
                            type="button"
                            class="w-full"
                            (click)="startUpgrade(plan)"
                          >
                            Upgrade to {{ plan.name }}
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
                                feature.name
                              }}</span>
                            </li>
                          }
                        }
                      </ul>

                      @if (plan.id === 'free') {
                        <p
                          class="text-muted-foreground mt-auto pt-4 text-xs leading-relaxed"
                        >
                          Free workspaces may pause after inactivity. Limit of 2
                          active workspaces on Free.
                        </p>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          }
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class PaywallDialogComponent {
  private readonly dialogService = inject(PaywallDialogService);
  private readonly billingPort = inject(BILLING_PORT);
  private readonly orgPort = inject(ORG_PORT);

  protected readonly planSkeletonSlots = [0, 1, 2] as const;
  protected readonly featureSkeletonSlots = [0, 1, 2, 3, 4] as const;

  protected readonly dialogContentClass = PAYWALL_DIALOG_CONTENT_CLASS;

  protected readonly dialogState = computed(() =>
    this.dialogService.open() ? 'open' : 'closed',
  );

  private readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  protected readonly view = signal<PaywallView>('plans');
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly plans = signal<readonly BillingPlan[]>([]);
  protected readonly currentPlanId = signal<CommercialPlanId>('free');
  protected readonly selectedPlanId = signal<CommercialPlanId | null>(null);
  protected readonly checkoutLoading = signal(false);
  protected readonly checkoutConfirming = signal(false);
  protected readonly checkoutError = signal<string | null>(null);

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

  protected planAction(planId: string): 'current' | 'upgrade' | 'none' {
    const current = this.currentPlanId();
    const tier = planId as CommercialPlanId;
    if (tier === current) {
      return 'current';
    }
    if (comparePlanTiers(tier, current) > 0) {
      return 'upgrade';
    }
    return 'none';
  }

  protected isSuggestedPlan(planId: string): boolean {
    return this.dialogService.suggestedPlanId() === planId;
  }

  protected async startUpgrade(plan: BillingPlan): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      this.loadError.set('No active workspace.');
      return;
    }

    this.selectedPlanId.set(plan.id as CommercialPlanId);
    this.view.set('checkout');
    this.checkoutLoading.set(true);
    this.checkoutError.set(null);

    const seatFeature = plan.features.find((feature) => feature.id === 'seats');
    const result = await this.billingPort.createCheckoutSession(
      org.id,
      plan.id,
      seatFeature?.limit ?? 10,
    );
    this.checkoutLoading.set(false);

    if (!result.ok) {
      this.checkoutError.set(result.error.message);
      this.view.set('plans');
      this.selectedPlanId.set(null);
    }
  }

  protected backToPlans(): void {
    this.view.set('plans');
    this.selectedPlanId.set(null);
    this.checkoutLoading.set(false);
    this.checkoutConfirming.set(false);
    this.checkoutError.set(null);
  }

  protected async confirmMockCheckout(): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      return;
    }

    this.checkoutConfirming.set(true);
    this.checkoutError.set(null);
    const result = await this.billingPort.confirmCheckout(org.id);
    this.checkoutConfirming.set(false);

    if (result.ok) {
      this.dialogService.completeSuccess();
    } else {
      this.checkoutError.set(result.error.message);
    }
  }

  protected onDialogClosed(): void {
    if (this.checkoutConfirming()) {
      return;
    }
    this.dialogService.close();
  }

  private async loadPaywallData(): Promise<void> {
    const org = this.activeOrganization();
    if (!org) {
      this.loadError.set('No active workspace.');
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
      this.loadError.set(plansResult.error.message);
      return;
    }
    if (!summaryResult.ok) {
      this.loadError.set(summaryResult.error.message);
      return;
    }

    this.plans.set(plansResult.data);
    this.currentPlanId.set(resolveCurrentPlanId(summaryResult.data));
  }

  private resetState(): void {
    this.view.set('plans');
    this.loading.set(false);
    this.loadError.set(null);
    this.plans.set([]);
    this.currentPlanId.set('free');
    this.selectedPlanId.set(null);
    this.checkoutLoading.set(false);
    this.checkoutConfirming.set(false);
    this.checkoutError.set(null);
  }
}
