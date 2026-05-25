import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  AddPaymentMethodInput,
  BillingPlan,
  BillingSummary,
  CheckoutSession,
  InvoiceListPage,
  PaymentMethod,
  PortalSession,
} from './models/billing.model';
import type { BillingProviderId } from './billing-provider.model';
import type { PortResult } from './models/common.model';
import type { OrganizationId } from './models/org.model';

export type { BillingProviderId } from './billing-provider.model';

/**
 * Billing UI contract. v0.3: mock adapter; v1.0: Stripe via full-stack repo.
 * Loaders accept AbortSignal for rxResource / workspace switch safety.
 */
export interface BillingPort {
  /** Optional hot stream for shell; prefer rxResource per organizationId in features. */
  readonly summary$: Observable<BillingSummary | null>;

  getSummary(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<BillingSummary>>;

  listInvoices(
    organizationId: OrganizationId,
    cursor?: string,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<InvoiceListPage>>;

  listAvailablePlans(
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly BillingPlan[]>>;

  createCheckoutSession(
    organizationId: OrganizationId,
    planId: string,
    seats: number,
  ): Promise<PortResult<CheckoutSession>>;

  /** After hosted/embedded checkout completes (mock: simulated; v1.0: polls backend). */
  confirmCheckout(
    organizationId: OrganizationId,
  ): Promise<PortResult<BillingSummary>>;

  /** Immediate plan change (mock downgrade; v1.0: Stripe subscription update). */
  changePlan(
    organizationId: OrganizationId,
    planId: string,
  ): Promise<PortResult<BillingSummary>>;

  createPortalSession(
    organizationId: OrganizationId,
    returnUrl: string,
  ): Promise<PortResult<PortalSession>>;

  listPaymentMethods(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly PaymentMethod[]>>;

  /** Mock: validates test card; v1.0: SetupIntent + attach to Stripe Customer. */
  addPaymentMethod(
    organizationId: OrganizationId,
    input: AddPaymentMethodInput,
  ): Promise<PortResult<PaymentMethod>>;

  setDefaultPaymentMethod(
    organizationId: OrganizationId,
    paymentMethodId: string,
  ): Promise<PortResult<PaymentMethod>>;

  removePaymentMethod(
    organizationId: OrganizationId,
    paymentMethodId: string,
  ): Promise<PortResult<void>>;

  cancelSubscription(
    organizationId: OrganizationId,
    reason: string,
  ): Promise<PortResult<void>>;

  /** Team per-seat: bump Stripe subscription quantity (and Postgres seats_limit). */
  syncSubscriptionSeats(
    organizationId: OrganizationId,
    seatQuantity?: number,
  ): Promise<PortResult<BillingSummary>>;
}

export const BILLING_PORT = new InjectionToken<BillingPort>('BILLING_PORT');

/** Active billing backend for `apps/web` (`mock` | `stripe` | `custom`). */
export const BILLING_PROVIDER_ID = new InjectionToken<BillingProviderId>(
  'BILLING_PROVIDER_ID',
  { factory: () => 'mock' },
);

/** True when {@link BILLING_PROVIDER_ID} is `stripe` (Checkout / Customer Portal Edge Functions). */
export const STRIPE_BILLING_ENABLED = new InjectionToken<boolean>(
  'STRIPE_BILLING_ENABLED',
  { factory: () => false },
);
