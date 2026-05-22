import { InjectionToken } from '@angular/core';

export interface SupabaseConfig {
  readonly url: string;
  readonly anonKey: string;
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>(
  'SUPABASE_CONFIG',
);

export function isSupabaseConfigured(
  config: SupabaseConfig | null | undefined,
): config is SupabaseConfig {
  return Boolean(config?.url?.trim() && config?.anonKey?.trim());
}
