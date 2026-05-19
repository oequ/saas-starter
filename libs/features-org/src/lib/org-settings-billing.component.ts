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
  type InvoiceStatus,
  type SubscriptionStatus,
} from '@oequ/ports';
import { PaywallDialogService } from '@oequ/shell';
import { HlmBadgeImports, type BadgeVariants } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

export type BillingSettingsSection = 'overview' | 'invoices' | 'payment';

@Component({
  selector: 'oequ-org-settings-billing',
  imports: [
    CurrencyPipe,
    DatePipe,
    HlmCardImports,
    HlmButtonImports,
    HlmBadgeImports,
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
            <section hlmCard variant="outline" class="gap-0 overflow-hidden py-0">
              <div hlmCardContent class="!p-6">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p class="text-muted-foreground text-sm">Current plan</p>
                    <h3 class="mt-1 text-xl font-semibold tracking-tight">
                      {{ formatPlanLabel(billing.planId, billing.planName) }}
                    </h3>
                    <p class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
                      Status
                      @let subscriptionBadge =
                        subscriptionStatusBadge(billing.status);
                      <span
                        hlmBadge
                        [variant]="subscriptionBadge.variant"
                        [class]="subscriptionBadge.class"
                      >
                        {{ formatSubscriptionStatus(billing.status) }}
                      </span>
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
                  class="text-muted-foreground border-b text-xs font-medium"
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
                      <td class="px-4 py-3">
                        @let invoiceBadge = invoiceStatusBadge(invoice.status);
                        <span
                          hlmBadge
                          [variant]="invoiceBadge.variant"
                          [class]="invoiceBadge.class"
                        >
                          {{ invoice.status }}
                        </span>
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
          <section hlmCard variant="outline" class="gap-0 overflow-hidden py-0">
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
              class="border-border flex min-h-[57px] items-center justify-end border-t !py-3"
            >
              <button hlmBtn type="button" (click)="openPaymentPortal()">
                Manage in portal
              </button>
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class OrgSettingsBillingComponent {
  readonly organizationId = input.required<string>();
  readonly section = input<BillingSettingsSection>('overview');

  private readonly billingPort = inject(BILLING_PORT);
  private readonly paywallDialog = inject(PaywallDialogService);

  protected readonly formatPlanLabel = formatPlanLabel;
  protected readonly formatSubscriptionStatus = formatSubscriptionStatus;
  protected readonly seatUsagePercent = billingSeatUsagePercent;

  protected readonly statusMessage = signal<string | null>(null);

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
    this.statusMessage.set(null);
    const result = await this.paywallDialog.requestOpen();
    if (result === 'success') {
      this.billingResource.reload();
      this.statusMessage.set('Plan upgraded successfully.');
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

  protected subscriptionStatusBadge(status: SubscriptionStatus): {
    variant: BadgeVariants['variant'];
    class: string;
  } {
    switch (status) {
      case 'active':
        return {
          variant: 'outline',
          class:
            'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        };
      case 'trialing':
        return {
          variant: 'outline',
          class:
            'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400',
        };
      case 'past_due':
      case 'unpaid':
        return { variant: 'destructive', class: '' };
      default:
        return { variant: 'secondary', class: '' };
    }
  }

  protected invoiceStatusBadge(status: InvoiceStatus): {
    variant: BadgeVariants['variant'];
    class: string;
  } {
    switch (status) {
      case 'paid':
        return {
          variant: 'outline',
          class:
            'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 capitalize dark:text-emerald-400',
        };
      case 'open':
        return {
          variant: 'outline',
          class:
            'border-amber-500/25 bg-amber-500/10 text-amber-800 capitalize dark:text-amber-400',
        };
      case 'uncollectible':
        return { variant: 'destructive', class: 'capitalize' };
      default:
        return { variant: 'secondary', class: 'capitalize' };
    }
  }
}
