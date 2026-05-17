import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  BILLING_PORT,
  type BillingSummary,
  type SubscriptionStatus,
} from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'oequ-org-settings-billing',
  imports: [HlmCardImports, HlmButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section hlmCard class="gap-0 overflow-hidden py-0">
      <div hlmCardContent class="!p-6">
        <h2 class="text-xl leading-8 font-semibold tracking-tight">Plan</h2>
        <p class="text-muted-foreground my-3 text-sm leading-6">
          Manage subscription and seats for this workspace.
        </p>

        @if (loading()) {
          <p class="text-muted-foreground text-sm">Loading billing…</p>
        } @else if (summary(); as billing) {
          <dl class="grid max-w-md gap-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-muted-foreground">Plan</dt>
              <dd class="font-medium capitalize">
                {{ formatPlan(billing.planId) }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted-foreground">Status</dt>
              <dd class="font-medium capitalize">
                {{ formatStatus(billing.status) }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted-foreground">Seats</dt>
              <dd class="font-medium">
                {{ billing.seatsUsed
                }}{{
                  billing.seatsLimit !== null ? ' / ' + billing.seatsLimit : ''
                }}
              </dd>
            </div>
          </dl>
        } @else {
          <p class="text-muted-foreground text-sm">
            Billing information is not available.
          </p>
        }
      </div>

      <div
        hlmCardFooter
        class="border-border bg-muted/50 text-foreground flex min-h-[57px] flex-wrap items-center justify-between gap-4 border-t !py-3 text-sm leading-relaxed"
      >
        @if (statusMessage(); as message) {
          <p role="status" class="min-w-0 flex-1">{{ message }}</p>
        } @else {
          <p class="text-muted-foreground min-w-0 flex-1">
            Upgrade to unlock more seats and features.
          </p>
        }
        <button hlmBtn type="button" (click)="upgrade()">Upgrade plan</button>
      </div>
    </section>
  `,
})
export class OrgSettingsBillingComponent {
  readonly organizationId = input.required<string>();

  private readonly billingPort = inject(BILLING_PORT);

  protected readonly summary = signal<BillingSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly statusMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      void this.loadSummary(organizationId);
    });
  }

  protected upgrade(): void {
    this.statusMessage.set('Checkout will be available in v0.3.');
  }

  protected formatPlan(planId: string | null): string {
    if (!planId) {
      return 'Free';
    }
    return planId.replace(/-/g, ' ');
  }

  protected formatStatus(status: SubscriptionStatus): string {
    switch (status) {
      case 'trialing':
        return 'Trial';
      case 'past_due':
        return 'Past due';
      case 'none':
        return 'No subscription';
      default:
        return status;
    }
  }

  private async loadSummary(organizationId: string): Promise<void> {
    this.loading.set(true);
    this.statusMessage.set(null);
    const result = await this.billingPort.getSummary(organizationId);
    this.summary.set(result.ok ? result.data : null);
    this.loading.set(false);
  }
}
