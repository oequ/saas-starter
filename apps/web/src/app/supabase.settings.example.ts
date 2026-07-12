/** Copy to `supabase.settings.ts` and paste keys from `npm run db:status`. */
export const webSupabaseSettings = {
  // Prefer 127.0.0.1 for the API URL (Docker/Kong). Keep the app on localhost:4201.
  url: 'http://127.0.0.1:54321',
  anonKey: 'sb_publishable_…',
  /** `mock` | `stripe` | `custom` — see docs/BILLING_CUSTOM_PROVIDER.md */
  billingProvider: 'mock' as const,
  /** @deprecated Use billingProvider: 'stripe' */
  stripeEnabled: false,
  /**
   * When true, signup redirects to `/auth/confirm-email` (OTP or email link).
   * Must match `[auth.email] enable_confirmations` in supabase/config.toml
   * (committed default is true). See supabase/README.md.
   */
  requireEmailConfirmation: true,
};
