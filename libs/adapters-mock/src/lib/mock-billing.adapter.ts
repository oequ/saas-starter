import { Injectable, Injector, inject } from '@angular/core';
import {
  alignBillingSummarySeats,
  BILLING_PORT,
  checkoutBillableSeatCount,
  isPerSeatBillingPlan,
  TEAM_PLAN_MAX_SEATS,
  type AddPaymentMethodInput,
  type BillingPort,
  type BillingPlan,
  type BillingSummary,
  type CheckoutSession,
  type CommercialPlanId,
  type InvoiceListPage,
  type OrganizationId,
  type PaymentMethod,
  type PortalSession,
  comparePlanTiers,
  detectCardBrandFromNumber,
  getDowngradeBlocker,
  getPlanChangeDirection,
  normalizeCardNumber,
  portOk,
  type PortResult,
  resolveCurrentPlanId,
  validateMockPaymentMethodInput,
} from '@oequ/ports';
import { mockErr } from './mock-port-error';
import { BehaviorSubject, type Observable } from 'rxjs';

import {
  addDaysIso,
  alignBillingSummaryMeters,
  mergeMetersForPlan,
  MOCK_BILLING_LATENCY_MS,
  MOCK_BILLING_PLANS,
  mockBillingSummaryForOrg,
  mockInvoicesForOrg,
  mockPaymentMethodsForOrg,
} from './data/mock-billing-data';
import { MOCK_ORGANIZATIONS } from './data/mock-data';
import {
  billableOutboundCount,
  countBillableEmailsToday,
} from './email-usage-stats';
import { MockEmailsAdapter } from './mock-emails.adapter';

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

@Injectable()
export class MockBillingAdapter implements BillingPort {
  private readonly injector = inject(Injector);

  private pendingCheckout: { organizationId: string; planId: string } | null =
    null;

  private readonly summaries = new Map<string, BillingSummary>(
    MOCK_ORGANIZATIONS.map((org) => {
      const summary = alignBillingSummarySeats(
        { ...mockBillingSummaryForOrg(org.id) },
        MOCK_BILLING_PLANS,
      );
      return [org.id, summary] as const;
    }),
  );

  private readonly paymentMethods = new Map<string, PaymentMethod[]>(
    MOCK_ORGANIZATIONS.map((org) => [
      org.id,
      [...mockPaymentMethodsForOrg(org.id)],
    ]),
  );

  private readonly summarySubject = new BehaviorSubject<BillingSummary | null>(
    this.summaries.get(MOCK_ORGANIZATIONS[0].id) ?? null,
  );

  readonly summary$: Observable<BillingSummary | null> =
    this.summarySubject.asObservable();

  async getSummary(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<BillingSummary>> {
    await delay(MOCK_BILLING_LATENCY_MS, abortSignal);
    const summary = this.persistSummary(
      this.applyEmailUsageFromStore(
        this.getOrCreateSummary(organizationId),
        organizationId,
      ),
    );
    this.summarySubject.next(summary);
    return portOk(summary);
  }

  private applyEmailUsageFromStore(
    summary: BillingSummary,
    organizationId: OrganizationId,
  ): BillingSummary {
    const emailsAdapter = this.injector.get(MockEmailsAdapter, null);
    if (!emailsAdapter) {
      return summary;
    }
    const snapshot = emailsAdapter.outboundSnapshot(organizationId);
    const consumed = billableOutboundCount(snapshot);
    const dailyConsumed = countBillableEmailsToday(snapshot);
    return {
      ...summary,
      meters: summary.meters.map((meter) =>
        meter.metricId === 'emails_sent'
          ? {
              ...meter,
              consumed,
              dailyConsumed:
                meter.dailyLimit != null ? dailyConsumed : meter.dailyConsumed,
            }
          : meter,
      ),
    };
  }

  async listInvoices(
    organizationId: OrganizationId,
    _cursor?: string,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<InvoiceListPage>> {
    await delay(MOCK_BILLING_LATENCY_MS, abortSignal);
    return portOk(mockInvoicesForOrg(organizationId));
  }

  async listAvailablePlans(
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly BillingPlan[]>> {
    await delay(MOCK_BILLING_LATENCY_MS, abortSignal);
    return portOk(MOCK_BILLING_PLANS);
  }

  async createCheckoutSession(
    organizationId: OrganizationId,
    planId: string,
    seats: number,
  ): Promise<PortResult<CheckoutSession>> {
    await delay(400);
    this.pendingCheckout = { organizationId, planId };
    return portOk({
      clientSecret: `mock_cs_${organizationId}_${planId}_${seats}`,
    });
  }

  async confirmCheckout(
    organizationId: OrganizationId,
  ): Promise<PortResult<BillingSummary>> {
    await delay(500);
    const pending = this.pendingCheckout;
    if (pending?.organizationId === organizationId) {
      this.applyMockPlanChange(organizationId, pending.planId);
      this.pendingCheckout = null;
    }
    const summary = this.getOrCreateSummary(organizationId);
    this.summarySubject.next(summary);
    return portOk(summary);
  }

  async changePlan(
    organizationId: OrganizationId,
    planId: string,
  ): Promise<PortResult<BillingSummary>> {
    await delay(400);
    const current = this.getOrCreateSummary(organizationId);
    const currentTier = resolveCurrentPlanId(current);
    const targetTier = planId as CommercialPlanId;

    if (getPlanChangeDirection(currentTier, targetTier) !== 'downgrade') {
      return mockErr('VALIDATION', 'billingDowngradeOnly');
    }

    const blocker = getDowngradeBlocker(current, planId, MOCK_BILLING_PLANS);
    if (blocker) {
      return mockErr('PLAN_DOWNGRADE_BLOCKED', 'billingPlanDowngradeBlocked');
    }

    const summary = this.persistSummary(
      this.applyMockPlanChangeSummary(organizationId, planId, current),
    );
    return portOk(summary);
  }

  async createPortalSession(
    _organizationId: OrganizationId,
    returnUrl: string,
  ): Promise<PortResult<PortalSession>> {
    await delay(300);
    return portOk({
      url: `${returnUrl}?mock-portal=1`,
    });
  }

  async listPaymentMethods(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly PaymentMethod[]>> {
    await delay(MOCK_BILLING_LATENCY_MS, abortSignal);
    return portOk(this.getPaymentMethods(organizationId));
  }

  async addPaymentMethod(
    organizationId: OrganizationId,
    input: AddPaymentMethodInput,
  ): Promise<PortResult<PaymentMethod>> {
    await delay(400);
    const validationError = validateMockPaymentMethodInput(input);
    if (validationError) {
      return mockErr(
        'VALIDATION',
        validationError.reason,
        validationError.params,
      );
    }

    const digits = normalizeCardNumber(input.number);
    const methods = this.getPaymentMethodsMutable(organizationId);
    const isFirst = methods.length === 0;
    const created: PaymentMethod = {
      id: `pm_${organizationId}_${Date.now()}`,
      brand: detectCardBrandFromNumber(digits),
      last4: digits.slice(-4),
      expMonth: input.expMonth,
      expYear: input.expYear,
      isDefault: isFirst,
    };

    if (isFirst) {
      methods.push(created);
    } else {
      methods.push({ ...created, isDefault: false });
    }
    return portOk(created);
  }

  async setDefaultPaymentMethod(
    organizationId: OrganizationId,
    paymentMethodId: string,
  ): Promise<PortResult<PaymentMethod>> {
    await delay(300);
    const methods = this.getPaymentMethodsMutable(organizationId);
    const target = methods.find((m) => m.id === paymentMethodId);
    if (!target) {
      return mockErr('NOT_FOUND', 'paymentMethodNotFound');
    }
    const next = methods.map((method) => ({
      ...method,
      isDefault: method.id === paymentMethodId,
    }));
    this.paymentMethods.set(organizationId, next);
    return portOk(next.find((m) => m.id === paymentMethodId)!);
  }

  async removePaymentMethod(
    organizationId: OrganizationId,
    paymentMethodId: string,
  ): Promise<PortResult<void>> {
    await delay(300);
    const methods = this.getPaymentMethodsMutable(organizationId);
    const index = methods.findIndex((m) => m.id === paymentMethodId);
    if (index < 0) {
      return mockErr('NOT_FOUND', 'paymentMethodNotFound');
    }
    const removed = methods[index];
    let next = methods.filter((m) => m.id !== paymentMethodId);
    if (removed.isDefault && next.length > 0) {
      next = next.map((method, i) => ({
        ...method,
        isDefault: i === 0,
      }));
    }
    this.paymentMethods.set(organizationId, next);
    return portOk(undefined);
  }

  async cancelSubscription(
    organizationId: OrganizationId,
    reason: string,
  ): Promise<PortResult<void>> {
    void reason;
    await delay(400);
    const current = this.getOrCreateSummary(organizationId);
    this.persistSummary({
      ...current,
      cancelAtPeriodEnd: true,
      status: current.status === 'trialing' ? 'canceled' : current.status,
    });
    return portOk(undefined);
  }

  async syncSubscriptionSeats(
    organizationId: OrganizationId,
    seatQuantity?: number,
  ): Promise<PortResult<BillingSummary>> {
    await delay(400);
    const current = alignBillingSummarySeats(
      this.getOrCreateSummary(organizationId),
      MOCK_BILLING_PLANS,
    );
    const planId = resolveCurrentPlanId(current);
    if (!isPerSeatBillingPlan(planId)) {
      return mockErr('VALIDATION', 'billingNotPerSeatPlan');
    }
    const cap = TEAM_PLAN_MAX_SEATS;
    const nextLimit =
      seatQuantity !== undefined
        ? checkoutBillableSeatCount(planId, seatQuantity, cap)
        : Math.max(
            current.seatsLimit ?? 1,
            checkoutBillableSeatCount(planId, current.seatsUsed + 1, cap),
          );
    const summary = this.persistSummary({
      ...current,
      seatsLimit: nextLimit,
    });
    return portOk(summary);
  }

  seedOrganization(organizationId: OrganizationId): void {
    this.persistSummary({
      organizationId,
      planId: 'pro',
      planName: 'Pro',
      status: 'trialing',
      currentPeriodEnd: addDaysIso(14),
      cancelAtPeriodEnd: false,
      seatsUsed: 1,
      seatsLimit: 10,
      meters: [],
      trialEnd: addDaysIso(14),
    });
  }

  removeOrganization(organizationId: OrganizationId): void {
    this.summaries.delete(organizationId);
    this.paymentMethods.delete(organizationId);
    if (this.summarySubject.value?.organizationId === organizationId) {
      this.summarySubject.next(null);
    }
  }

  adjustSeatsUsed(organizationId: OrganizationId, delta: number): void {
    const current = this.getOrCreateSummary(organizationId);
    this.syncSeatsUsed(organizationId, Math.max(0, current.seatsUsed + delta));
  }

  /** Authoritative seat usage from org members (active + invited). */
  syncSeatsUsed(organizationId: OrganizationId, seatsUsed: number): void {
    const current = this.getOrCreateSummary(organizationId);
    this.persistSummary({ ...current, seatsUsed });
  }

  syncMeterConsumed(
    organizationId: OrganizationId,
    metricId: string,
    consumed: number,
    dailyConsumed?: number,
  ): void {
    const current = this.getOrCreateSummary(organizationId);
    const meters = current.meters.map((meter) =>
      meter.metricId === metricId
        ? {
            ...meter,
            consumed: Math.max(0, consumed),
            ...(dailyConsumed !== undefined && meter.dailyLimit != null
              ? { dailyConsumed: Math.max(0, dailyConsumed) }
              : {}),
          }
        : meter,
    );
    this.persistSummary({ ...current, meters });
  }

  /** Restores fixture billing data (E2E / screenshot runs). */
  resetMockState(): void {
    this.pendingCheckout = null;
    this.summaries.clear();
    this.paymentMethods.clear();
    for (const org of MOCK_ORGANIZATIONS) {
      this.persistSummary({ ...mockBillingSummaryForOrg(org.id) });
      this.paymentMethods.set(org.id, [...mockPaymentMethodsForOrg(org.id)]);
    }
    this.summarySubject.next(
      this.summaries.get(MOCK_ORGANIZATIONS[0].id) ?? null,
    );
  }

  /** Called by mock checkout UI after simulated payment success. */
  applyMockUpgrade(organizationId: OrganizationId, planId: string): void {
    const current = this.getOrCreateSummary(organizationId);
    this.persistSummary(
      this.applyMockPlanChangeSummary(organizationId, planId, current),
    );
  }

  private applyMockPlanChange(
    organizationId: OrganizationId,
    planId: string,
  ): void {
    const current = this.getOrCreateSummary(organizationId);
    this.persistSummary(
      this.applyMockPlanChangeSummary(organizationId, planId, current),
    );
  }

  private applyMockPlanChangeSummary(
    organizationId: OrganizationId,
    planId: string,
    current: BillingSummary,
  ): BillingSummary {
    void organizationId;
    const plan = MOCK_BILLING_PLANS.find((p) => p.id === planId);
    const targetTier = planId as CommercialPlanId;
    const isDowngrade =
      comparePlanTiers(targetTier, resolveCurrentPlanId(current)) < 0;

    return {
      ...current,
      planId,
      planName: plan?.name ?? planId,
      status: isDowngrade && current.status === 'trialing' ? 'active' : current.status,
      cancelAtPeriodEnd: false,
      trialEnd: isDowngrade ? null : current.trialEnd,
      meters: mergeMetersForPlan(
        targetTier,
        current.meters,
        organizationId,
      ),
    };
  }

  private getOrCreateSummary(organizationId: OrganizationId): BillingSummary {
    const existing = this.summaries.get(organizationId);
    if (existing) {
      return this.normalizeSummary(existing);
    }
    const created = this.normalizeSummary({
      ...mockBillingSummaryForOrg(organizationId),
    });
    this.summaries.set(organizationId, created);
    return created;
  }

  private normalizeSummary(summary: BillingSummary): BillingSummary {
    const withMeters = alignBillingSummaryMeters(summary);
    const planId = resolveCurrentPlanId(withMeters);
    if (isPerSeatBillingPlan(planId)) {
      const usageQty = checkoutBillableSeatCount(
        planId,
        withMeters.seatsUsed,
        TEAM_PLAN_MAX_SEATS,
      );
      const paid =
        summary.seatsLimit !== null && summary.seatsLimit >= usageQty
          ? summary.seatsLimit
          : usageQty;
      return {
        ...withMeters,
        seatsLimit: paid,
      };
    }
    return alignBillingSummarySeats(withMeters, MOCK_BILLING_PLANS);
  }

  private persistSummary(summary: BillingSummary): BillingSummary {
    const next = this.normalizeSummary(summary);
    this.summaries.set(summary.organizationId, next);
    if (this.summarySubject.value?.organizationId === summary.organizationId) {
      this.summarySubject.next(next);
    }
    return next;
  }

  private getPaymentMethods(organizationId: OrganizationId): PaymentMethod[] {
    return this.getPaymentMethodsMutable(organizationId).map((method) => ({
      ...method,
    }));
  }

  private getPaymentMethodsMutable(
    organizationId: OrganizationId,
  ): PaymentMethod[] {
    let methods = this.paymentMethods.get(organizationId);
    if (!methods) {
      methods = [];
      this.paymentMethods.set(organizationId, methods);
    }
    return methods;
  }
}

export const MOCK_BILLING_PROVIDER = {
  provide: BILLING_PORT,
  useExisting: MockBillingAdapter,
};
