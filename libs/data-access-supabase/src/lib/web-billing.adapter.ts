import { inject, Injectable } from '@angular/core';
import { MockBillingAdapter } from '@oequ/adapters-mock';
import {
  BILLING_PORT,
  checkoutBillableSeatCount,
  effectiveTeamSeatsLimitFromSnapshot,
  isPerSeatBillingPlan,
  portOk,
  resolveCurrentPlanId,
  TEAM_PLAN_MAX_SEATS,
  type AddPaymentMethodInput,
  type BillingPort,
  type BillingPlan,
  type BillingSummary,
  type CheckoutSession,
  type Invoice,
  type InvoiceListPage,
  type InvoiceStatus,
  type OrganizationId,
  type PaymentMethod,
  type PortalSession,
  type PortResult,
  type SubscriptionStatus,
} from '@oequ/ports';
import type { Observable } from 'rxjs';

import { resolveBillingProvider, SUPABASE_CONFIG } from './supabase-config';
import { SupabaseClientService } from './supabase-client.service';
import { supabaseErr } from './supabase-port-error';
import { supabaseErrFromRpc } from './supabase-rpc-error';

const BILLING_RETURN_PATH = '/workspace/settings/billing';

interface BillingSnapshotRpc {
  plan_id: string;
  seats_limit: number;
  seats_used: number;
  subscription_status?: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  has_stripe_customer?: boolean;
  billing_provider?: string;
  has_billing_customer?: boolean;
  emails_used_month?: number;
  emails_used_today?: number;
  emails_monthly_limit?: number | null;
  emails_daily_limit?: number | null;
}

const PLAN_NAMES: Readonly<Record<string, string>> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

@Injectable()
export class WebBillingAdapter implements BillingPort {
  private readonly mock = inject(MockBillingAdapter);
  private readonly supabase = inject(SupabaseClientService);
  private readonly config = inject(SUPABASE_CONFIG);

  get summary$(): Observable<BillingSummary | null> {
    return this.mock.summary$;
  }

  getSummary(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<BillingSummary>> {
    return this.withPostgresSnapshot(
      organizationId,
      this.mock.getSummary(organizationId, abortSignal),
    );
  }

  async listInvoices(
    organizationId: OrganizationId,
    cursor?: string,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<InvoiceListPage>> {
    if (resolveBillingProvider(this.config) === 'mock') {
      return this.mock.listInvoices(organizationId, cursor, abortSignal);
    }

    void abortSignal;
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.functions.invoke(
      'billing-list-invoices',
      {
        body: {
          organization_id: organizationId,
          cursor: cursor ?? undefined,
        },
      },
    );

    if (error) {
      return supabaseErr('UNAVAILABLE', 'billingInvoicesUnavailable');
    }

    const payload = data as {
      items?: unknown[];
      nextCursor?: string | null;
      error?: string;
    } | null;

    if (payload?.error) {
      if (payload.error.includes('no billing customer')) {
        return portOk({ items: [], nextCursor: null });
      }
      return supabaseErr('UNAVAILABLE', 'billingInvoicesUnavailable');
    }

    return portOk(this.mapInvoiceListPage(payload));
  }

  listAvailablePlans(
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly BillingPlan[]>> {
    return this.mock.listAvailablePlans(abortSignal);
  }

  async createCheckoutSession(
    organizationId: OrganizationId,
    planId: string,
    seats: number,
  ): Promise<PortResult<CheckoutSession>> {
    if (!this.isStripeEnabled()) {
      return this.mock.createCheckoutSession(organizationId, planId, seats);
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.functions.invoke(
      'billing-create-checkout',
      {
        body: {
          organization_id: organizationId,
          plan_id: planId,
          return_url: this.billingReturnUrl(),
          seat_quantity: seats,
        },
      },
    );

    if (error) {
      return supabaseErr('UNAVAILABLE', error.message);
    }

    const url = (data as { url?: string } | null)?.url;
    if (!url) {
      return supabaseErr('UNAVAILABLE', 'checkoutMissingUrl');
    }

    return portOk({ url });
  }

  async confirmCheckout(
    organizationId: OrganizationId,
  ): Promise<PortResult<BillingSummary>> {
    if (this.isStripeEnabled()) {
      return this.getSummary(organizationId);
    }

    const result = await this.mock.confirmCheckout(organizationId);
    if (!result.ok) {
      return result;
    }
    const planId = result.data.planId ?? 'free';
    const syncError = await this.syncPlanToPostgres(
      organizationId,
      planId,
      this.seatsLimitForPlanSync(result.data),
    );
    if (syncError) {
      return syncError;
    }
    return this.getSummary(organizationId);
  }

  async changePlan(
    organizationId: OrganizationId,
    planId: string,
  ): Promise<PortResult<BillingSummary>> {
    if (this.isStripeEnabled()) {
      return supabaseErr('VALIDATION', 'billingUseStripePortal');
    }

    const result = await this.mock.changePlan(organizationId, planId);
    if (!result.ok) {
      return result;
    }
    const syncError = await this.syncPlanToPostgres(
      organizationId,
      planId,
      this.seatsLimitForPlanSync(result.data),
    );
    if (syncError) {
      return syncError;
    }
    return this.getSummary(organizationId);
  }

  async createPortalSession(
    organizationId: OrganizationId,
    returnUrl: string,
  ): Promise<PortResult<PortalSession>> {
    if (!this.isStripeEnabled()) {
      return this.mock.createPortalSession(organizationId, returnUrl);
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.functions.invoke(
      'billing-create-portal',
      {
        body: {
          organization_id: organizationId,
          return_url: returnUrl,
        },
      },
    );

    if (error) {
      return supabaseErr('UNAVAILABLE', error.message);
    }

    const url = (data as { url?: string } | null)?.url;
    if (!url) {
      return supabaseErr('UNAVAILABLE', 'portalMissingUrl');
    }

    return portOk({ url });
  }

  listPaymentMethods(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly PaymentMethod[]>> {
    return this.mock.listPaymentMethods(organizationId, abortSignal);
  }

  addPaymentMethod(
    organizationId: OrganizationId,
    input: AddPaymentMethodInput,
  ): Promise<PortResult<PaymentMethod>> {
    return this.mock.addPaymentMethod(organizationId, input);
  }

  setDefaultPaymentMethod(
    organizationId: OrganizationId,
    paymentMethodId: string,
  ): Promise<PortResult<PaymentMethod>> {
    return this.mock.setDefaultPaymentMethod(organizationId, paymentMethodId);
  }

  removePaymentMethod(
    organizationId: OrganizationId,
    paymentMethodId: string,
  ): Promise<PortResult<void>> {
    return this.mock.removePaymentMethod(organizationId, paymentMethodId);
  }

  async cancelSubscription(
    organizationId: OrganizationId,
    reason: string,
  ): Promise<PortResult<void>> {
    if (this.isStripeEnabled()) {
      const client = this.supabase.getClient();
      if (!client) {
        return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
      }

      const { data, error } = await client.functions.invoke(
        'billing-cancel-subscription',
        {
          body: {
            organization_id: organizationId,
            reason,
          },
        },
      );

      if (error) {
        return supabaseErr('UNAVAILABLE', error.message);
      }

      const payload = data as { ok?: boolean; error?: string } | null;
      if (payload?.error) {
        if (payload.error.includes('no active stripe subscription')) {
          return supabaseErr('VALIDATION', 'billingNoActiveSubscription');
        }
        return supabaseErr('UNAVAILABLE', payload.error);
      }

      if (!payload?.ok) {
        return supabaseErr('UNAVAILABLE', 'billingCancelFailed');
      }

      return portOk(undefined);
    }

    return this.mock.cancelSubscription(organizationId, reason);
  }

  async syncSubscriptionSeats(
    organizationId: OrganizationId,
    seatQuantity?: number,
  ): Promise<PortResult<BillingSummary>> {
    if (!this.isStripeEnabled()) {
      const aligned = await this.ensureMockBillingAligned(organizationId);
      if (!aligned.ok) {
        return aligned;
      }
      const planId = resolveCurrentPlanId(aligned.data);
      if (!isPerSeatBillingPlan(planId)) {
        return supabaseErr('VALIDATION', 'billingNotPerSeatPlan');
      }

      const result = await this.mock.syncSubscriptionSeats(
        organizationId,
        seatQuantity,
      );
      if (!result.ok) {
        return result;
      }
      const syncError = await this.syncPlanToPostgres(
        organizationId,
        planId,
        result.data.seatsLimit ?? undefined,
      );
      if (syncError) {
        return syncError;
      }
      return this.getSummary(organizationId);
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.functions.invoke(
      'billing-update-subscription',
      {
        body: {
          organization_id: organizationId,
          seat_quantity: seatQuantity,
        },
      },
    );

    if (error) {
      return supabaseErr('UNAVAILABLE', error.message);
    }

    const payload = data as {
      ok?: boolean;
      error?: string;
      seats_limit?: number;
    } | null;

    if (payload?.error) {
      return this.mapSeatSyncError(payload.error);
    }

    if (!payload?.ok) {
      return supabaseErr('UNAVAILABLE', 'billingSeatSyncFailed');
    }

    return this.getSummary(organizationId);
  }

  private mapSeatSyncError<T>(message: string): PortResult<T> {
    if (message.includes('no active stripe subscription')) {
      return supabaseErr('VALIDATION', 'billingNoActiveSubscription');
    }
    if (message.includes('not_per_seat_plan')) {
      return supabaseErr('VALIDATION', 'billingNotPerSeatPlan');
    }
    if (
      message.includes('subscription_canceling') ||
      message.includes('subscription_not_billable')
    ) {
      return supabaseErr('VALIDATION', 'billingSubscriptionNotBillable');
    }
    if (message.includes('team_seat_cap_reached')) {
      return supabaseErr('VALIDATION', 'billingTeamSeatCapReached');
    }
    return supabaseErr('UNAVAILABLE', 'billingSeatSyncFailed');
  }

  private isStripeEnabled(): boolean {
    return resolveBillingProvider(this.config) === 'stripe';
  }

  private billingReturnUrl(): string {
    if (typeof globalThis.location === 'undefined') {
      return BILLING_RETURN_PATH;
    }
    return `${globalThis.location.origin}${BILLING_RETURN_PATH}`;
  }

  private async withPostgresSnapshot(
    organizationId: OrganizationId,
    mockResult: Promise<PortResult<BillingSummary>>,
  ): Promise<PortResult<BillingSummary>> {
    const result = await mockResult;
    if (!result.ok) {
      return result;
    }
    const snapshot = await this.fetchSnapshot(organizationId);
    if (snapshot.ok === false) {
      return { ok: false, error: snapshot.error };
    }
    return portOk(this.mergeSnapshot(result.data, snapshot.data));
  }

  private async fetchSnapshot(
    organizationId: OrganizationId,
  ): Promise<PortResult<BillingSnapshotRpc>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const { data, error } = await client.rpc('get_organization_billing_snapshot', {
      p_organization_id: organizationId,
    });
    if (error) {
      return supabaseErrFromRpc(error);
    }
    return portOk(data as BillingSnapshotRpc);
  }

  private mergeSnapshot(
    summary: BillingSummary,
    snapshot: BillingSnapshotRpc,
  ): BillingSummary {
    const planId = snapshot.plan_id === 'free' ? null : snapshot.plan_id;
    const status = this.mapSubscriptionStatus(snapshot.subscription_status);
    const meters = summary.meters.map((meter) => {
      if (meter.metricId !== 'emails_sent') {
        return meter;
      }
      return {
        ...meter,
        consumed: snapshot.emails_used_month ?? meter.consumed,
        limit: snapshot.emails_monthly_limit ?? meter.limit,
        dailyLimit: snapshot.emails_daily_limit ?? meter.dailyLimit,
        dailyConsumed: snapshot.emails_used_today ?? meter.dailyConsumed,
      };
    });

    return {
      ...summary,
      planId,
      planName: PLAN_NAMES[snapshot.plan_id] ?? summary.planName,
      seatsLimit: effectiveTeamSeatsLimitFromSnapshot(
        snapshot.plan_id,
        snapshot.seats_used,
        snapshot.seats_limit,
      ),
      seatsUsed: snapshot.seats_used,
      status,
      currentPeriodEnd:
        snapshot.current_period_end ?? summary.currentPeriodEnd,
      cancelAtPeriodEnd:
        (snapshot.cancel_at_period_end ?? false) || summary.cancelAtPeriodEnd,
      meters,
    };
  }

  private mapInvoiceListPage(payload: {
    items?: unknown[];
    nextCursor?: string | null;
  } | null): InvoiceListPage {
    const items = (payload?.items ?? []).map((raw) =>
      this.mapInvoiceDto(raw),
    );
    return {
      items,
      nextCursor: payload?.nextCursor ?? null,
    };
  }

  private mapInvoiceDto(raw: unknown): Invoice {
    const row = raw as {
      id: string;
      number: string;
      amountDue: number;
      amountPaid: number;
      currency: string;
      status: string;
      created: string;
      hostedInvoiceUrl: string;
      invoicePdf: string;
    };

    const status = this.mapInvoiceStatus(row.status);

    return {
      id: row.id,
      number: row.number,
      amountDue: row.amountDue,
      amountPaid: row.amountPaid,
      currency: row.currency,
      status,
      created: row.created,
      hostedInvoiceUrl: row.hostedInvoiceUrl,
      invoicePdf: row.invoicePdf || row.hostedInvoiceUrl,
    };
  }

  private mapInvoiceStatus(status: string): InvoiceStatus {
    switch (status) {
      case 'draft':
      case 'open':
      case 'paid':
      case 'uncollectible':
      case 'void':
        return status;
      default:
        return 'open';
    }
  }

  private mapSubscriptionStatus(
    status: string | undefined,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
      case 'past_due':
      case 'canceled':
      case 'unpaid':
      case 'incomplete':
      case 'paused':
      case 'none':
        return status;
      default:
        return 'none';
    }
  }

  /** Keep in-memory mock plan in sync with Postgres-backed billing snapshot. */
  private async ensureMockBillingAligned(
    organizationId: OrganizationId,
  ): Promise<PortResult<BillingSummary>> {
    const merged = await this.getSummary(organizationId);
    if (!merged.ok) {
      return merged;
    }
    const tier = resolveCurrentPlanId(merged.data);
    if (tier !== 'free') {
      this.mock.applyMockUpgrade(organizationId, tier);
    }
    return merged;
  }

  private seatsLimitForPlanSync(summary: BillingSummary): number | undefined {
    const planId = summary.planId ?? 'free';
    if (!isPerSeatBillingPlan(planId)) {
      return undefined;
    }
    return (
      summary.seatsLimit ??
      checkoutBillableSeatCount(planId, summary.seatsUsed, TEAM_PLAN_MAX_SEATS)
    );
  }

  private async syncPlanToPostgres(
    organizationId: OrganizationId,
    planId: string | null,
    seatsLimit?: number,
  ): Promise<PortResult<BillingSummary> | null> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const tier = planId && planId !== 'free' ? planId : 'free';
    const { error } = await client.rpc('update_organization_plan', {
      p_organization_id: organizationId,
      p_plan_id: tier,
      p_seats_limit: seatsLimit ?? null,
    });
    if (error) {
      return supabaseErrFromRpc(error);
    }
    return null;
  }
}

export const WEB_BILLING_PROVIDER = {
  provide: BILLING_PORT,
  useExisting: WebBillingAdapter,
};
