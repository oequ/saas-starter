import { InjectionToken } from '@angular/core';
import type { BillingProviderId } from '@oequ/ports';

export interface SupabaseConfig {
  readonly url: string;
  readonly anonKey: string;
  /**
   * Billing backend for checkout/portal/webhooks.
   * When omitted: `stripe` if `stripeEnabled`, otherwise `mock`.
   */
  readonly billingProvider?: BillingProviderId;
  /** @deprecated Prefer `billingProvider: 'stripe'`. */
  readonly stripeEnabled?: boolean;
  /**
   * When true, signup shows `/auth/confirm-email` (OTP or link) before onboarding.
   * Requires Supabase Auth `enable_confirmations = true` when using full-stack.
   */
  readonly requireEmailConfirmation?: boolean;
}

export function resolveBillingProvider(
  config: SupabaseConfig,
): BillingProviderId {
  if (config.billingProvider) {
    return config.billingProvider;
  }
  return config.stripeEnabled === true ? 'stripe' : 'mock';
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>(
  'SUPABASE_CONFIG',
);

export function isSupabaseConfigured(
  config: SupabaseConfig | null | undefined,
): config is SupabaseConfig {
  return Boolean(config?.url?.trim() && config?.anonKey?.trim());
}
