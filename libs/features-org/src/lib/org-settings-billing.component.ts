import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import {
  BILLING_PORT,
  billingSeatUsagePercent,
  formatPlanLabel,
  formatSubscriptionStatus,
  type Invoice,
} from '@oequ/ports';
import { SETTINGS_DIALOG_CONTENT_CLASS } from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export type BillingSettingsSection = 'overview' | 'invoices' | 'payment';

@Component({
  selector: 'oequ-org-settings-billing',
  imports: [
    CurrencyPipe,
    DatePipe,
    HlmCardImports,
    HlmButtonImports,
    HlmDialogImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Billing</h2>
        <p class="text-muted-foreground mt-1 text-sm leading-6">
          Manage your plan, payment methods, and invoices for this workspace.
        </p>
        @if (statusMessage(); as message) {
          <p role="status" class="text-muted-foreground mt-3 text-sm">{{ message }}</p>
        }
      </div>

      @switch (section()) {
        @case ('overview') {
          @if (billingResource.isLoading()) {
            <p class="text-muted-foreground text-sm">Loading billing…</p>
          } @else if (billingResource.error(); as err) {
            <p class="text-destructive text-sm">{{ err.message }}</p>
          } @else if (summary(); as billing) {
            <section hlmCard class="gap-0 overflow-hidden py-0">
              <div hlmCardContent class="!p-6">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p class="text-muted-foreground text-sm">Current plan</p>
                    <h3 class="mt-1 text-xl font-semibold tracking-tight">
                      {{ formatPlanLabel(billing.planId, billing.planName) }}
                    </h3>
                    <p class="text-muted-foreground mt-1 text-sm">
                      Status:
                      <span class="text-foreground font-medium">{{
                        formatSubscriptionStatus(billing.status)
                      }}</span>
                    </p>
                    @if (billing.currentPeriodEnd; as periodEnd) {
                      <p class="text-muted-foreground mt-1 text-sm">
                        Renews on {{ periodEnd | date: 'mediumDate' }}
                      </p>
                    }
                    @if (billing.cancelAtPeriodEnd) {
                      <p class="text-muted-foreground mt-2 text-sm">
                        Cancels at the end of the current billing period.
                      </p>
                    }
                  </div>
                  <button hlmBtn type="button" (click)="openUpgradeDialog()">
                    Upgrade plan
                  </button>
                </div>

                @if (seatUsagePercent(billing); as percent) {
                  <div class="mt-6 max-w-md">
                    <div class="mb-2 flex justify-between text-sm">
                      <span class="text-muted-foreground">Seats</span>
                      <span class="font-medium">
                        {{ billing.seatsUsed }} /
                        {{ billing.seatsLimit ?? '∞' }} used
                      </span>
                    </div>
                    <div
                      class="bg-muted h-2 w-full overflow-hidden rounded-full"
                      role="progressbar"
                      [attr.aria-valuenow]="percent"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      <div
                        class="bg-primary h-full rounded-full transition-[width]"
                        [style.width.%]="percent"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </section>
          } @else {
            <p class="text-muted-foreground text-sm">
              Billing information is not available.
            </p>
          }
        }
        @case ('invoices') {
          @if (invoicesResource.isLoading()) {
            <p class="text-muted-foreground text-sm">Loading invoices…</p>
          } @else if (invoices().length === 0) {
            <p class="text-muted-foreground text-sm">
              No invoices available for this period.
            </p>
          } @else {
            <div class="border-input overflow-hidden rounded-[5px] border">
              <table class="w-full text-left text-sm">
                <thead
                  class="bg-muted/50 text-muted-foreground border-b text-xs font-medium"
                >
                  <tr>
                    <th class="px-4 py-2.5 font-medium">Date</th>
                    <th class="px-4 py-2.5 font-medium">Amount</th>
                    <th class="px-4 py-2.5 font-medium">Status</th>
                    <th class="px-4 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-border divide-y">
                  @for (invoice of invoices(); track invoice.id) {
                    <tr class="hover:bg-muted/30">
                      <td class="px-4 py-3 font-medium">
                        {{ invoice.created | date: 'mediumDate' }}
                      </td>
                      <td class="px-4 py-3">
                        {{
                          invoice.amountDue / 100
                            | currency: invoice.currency
                        }}
                      </td>
                      <td class="px-4 py-3 capitalize">
                        {{ invoice.status }}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <a
                          hlmBtn
                          variant="ghost"
                          size="sm"
                          [href]="invoice.invoicePdf"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download PDF
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
        @case ('payment') {
          <section hlmCard class="gap-0 overflow-hidden py-0">
            <div hlmCardContent class="!p-6">
              <h3 class="text-lg font-semibold">Payment method</h3>
              <p class="text-muted-foreground mt-2 text-sm leading-6">
                Card updates and tax details are managed in our secure payment
                partner portal.
              </p>
              <p class="text-muted-foreground mt-4 text-xs">
                Payments processed securely by our payment partner.
              </p>
            </div>
            <div
              hlmCardFooter
              class="border-border bg-muted/50 flex min-h-[57px] items-center justify-end border-t !py-3"
            >
              <button hlmBtn type="button" (click)="openPaymentPortal()">
                Manage in portal
              </button>
            </div>
          </section>
        }
      }
    </div>

    <hlm-dialog [state]="upgradeDialogState()" (closed)="closeUpgradeDialog()">
      <ng-template hlmDialogPortal>
        <hlm-dialog-content [class]="dialogContentClass">
          <hlm-dialog-header>
            <h3 hlmDialogTitle>Upgrade plan</h3>
            <p hlmDialogDescription>
              Simulated checkout for the standalone demo. No card is charged.
            </p>
          </hlm-dialog-header>

          @if (checkoutLoading()) {
            <p class="text-muted-foreground py-6 text-center text-sm">
              Initializing secure checkout…
            </p>
          } @else {
            <div class="space-y-4 py-2">
              <p class="text-sm leading-6">
                By upgrading, you agree to the organizational Terms of Service.
                Billed securely via our payment partner.
              </p>
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
        </hlm-dialog-content>
      </ng-template>
    </hlm-dialog>
  `,
})
export class OrgSettingsBillingComponent {
  readonly organizationId = input.required<string>();
  readonly section = input<BillingSettingsSection>('overview');

  private readonly billingPort = inject(BILLING_PORT);

  protected readonly dialogContentClass = SETTINGS_DIALOG_CONTENT_CLASS;
  protected readonly formatPlanLabel = formatPlanLabel;
  protected readonly formatSubscriptionStatus = formatSubscriptionStatus;
  protected readonly seatUsagePercent = billingSeatUsagePercent;

  protected readonly upgradeDialogOpen = signal(false);
  protected readonly checkoutLoading = signal(false);
  protected readonly checkoutConfirming = signal(false);
  protected readonly statusMessage = signal<string | null>(null);

  protected readonly upgradeDialogState = computed(() =>
    this.upgradeDialogOpen() ? 'open' : 'closed',
  );

  protected readonly billingResource = resource({
    params: () => ({ orgId: this.organizationId() }),
    loader: async ({ params, abortSignal }) => {
      const result = await this.billingPort.getSummary(
        params.orgId,
        abortSignal,
      );
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  protected readonly invoicesResource = resource({
    params: () => ({ orgId: this.organizationId() }),
    loader: async ({ params, abortSignal }) => {
      const result = await this.billingPort.listInvoices(
        params.orgId,
        undefined,
        abortSignal,
      );
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data.items;
    },
  });

  protected readonly summary = computed(() => this.billingResource.value());

  protected readonly invoices = computed(
    (): readonly Invoice[] => this.invoicesResource.value() ?? [],
  );

  protected async openUpgradeDialog(): Promise<void> {
    const orgId = this.organizationId();
    this.upgradeDialogOpen.set(true);
    this.checkoutLoading.set(true);
    this.checkoutConfirming.set(false);

    const result = await this.billingPort.createCheckoutSession(
      orgId,
      'professional',
      this.summary()?.seatsLimit ?? 10,
    );
    this.checkoutLoading.set(false);
    if (!result.ok) {
      this.statusMessage.set(result.error.message);
      this.upgradeDialogOpen.set(false);
    }
  }

  protected closeUpgradeDialog(): void {
    this.upgradeDialogOpen.set(false);
    this.checkoutLoading.set(false);
    this.checkoutConfirming.set(false);
  }

  protected async confirmMockCheckout(): Promise<void> {
    this.checkoutConfirming.set(true);
    const result = await this.billingPort.confirmCheckout(this.organizationId());
    this.checkoutConfirming.set(false);
    if (result.ok) {
      this.billingResource.reload();
      this.closeUpgradeDialog();
      this.statusMessage.set('Plan upgraded successfully.');
    } else {
      this.statusMessage.set(result.error.message);
    }
  }

  protected async openPaymentPortal(): Promise<void> {
    const returnUrl =
      typeof window !== 'undefined' ? window.location.href : '/';
    const result = await this.billingPort.createPortalSession(
      this.organizationId(),
      returnUrl,
    );
    if (result.ok && typeof window !== 'undefined') {
      window.location.assign(result.data.url);
    } else if (!result.ok) {
      this.statusMessage.set(result.error.message);
    }
  }
}
