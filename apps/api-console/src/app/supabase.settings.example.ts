/** Copy to `supabase.settings.ts` or run `node scripts/write-web-supabase-settings.mjs`. */
export const apiConsoleSupabaseSettings = {
  url: 'http://127.0.0.1:54321',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  billingProvider: 'mock' as const,
  stripeEnabled: false,
  requireEmailConfirmation: true,
};
