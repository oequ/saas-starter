/** Copy to `supabase.settings.ts` and paste keys from `npm run db:status`. */
export const webSupabaseSettings = {
  url: 'http://127.0.0.1:54321',
  anonKey: 'sb_publishable_…',
  /** `mock` | `stripe` | `custom` — see docs/BILLING_CUSTOM_PROVIDER.md */
  billingProvider: 'mock' as const,
  /** @deprecated Use billingProvider: 'stripe' */
  stripeEnabled: false,
  /**
   * When true, signup redirects to `/auth/confirm-email` (OTP or email link).
   * Also set `enable_confirmations = true` in supabase/config.toml — see supabase/README.md.
   */
  requireEmailConfirmation: false,
};
