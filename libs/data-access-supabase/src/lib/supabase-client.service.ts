import { Optional, PLATFORM_ID, type Provider } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  isSupabaseConfigured,
  SUPABASE_CONFIG,
  type SupabaseConfig,
} from './supabase-config';

/**
 * Same check as Angular `isPlatformBrowser(PLATFORM_ID)` (`'browser'`),
 * without importing `@angular/common` (that pulls PlatformLocation and breaks
 * non-Angular bundles such as `apps/web-react`).
 */
function isBrowserPlatform(platformId: object | string): boolean {
  return platformId === 'browser';
}

/** Plain Supabase client holder — wire via provideSupabaseClient() (no @Injectable). */
export class SupabaseClientService {
  private client: SupabaseClient | null | undefined;

  constructor(
    private readonly platformId: object | string,
    private readonly config?: SupabaseConfig | null,
  ) {}

  configured(): boolean {
    return isSupabaseConfigured(this.config);
  }

  /** Browser-only client when URL + anon/publishable key are configured. */
  getClient(): SupabaseClient | null {
    if (!isBrowserPlatform(this.platformId)) {
      return null;
    }
    if (this.client !== undefined) {
      return this.client;
    }
    if (!isSupabaseConfigured(this.config)) {
      this.client = null;
      return null;
    }
    this.client = createClient(this.config.url, this.config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return this.client;
  }

  requireClient(): SupabaseClient | null {
    return this.getClient();
  }

  static fromConfig(config: SupabaseConfig): SupabaseConfig {
    return config;
  }
}

export function provideSupabaseClient(): Provider[] {
  return [
    {
      provide: SupabaseClientService,
      useFactory: (platformId: object, config: SupabaseConfig | null) =>
        new SupabaseClientService(platformId, config),
      deps: [PLATFORM_ID, [new Optional(), SUPABASE_CONFIG]],
    },
  ];
}
