import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  isSupabaseConfigured,
  SUPABASE_CONFIG,
  type SupabaseConfig,
} from './supabase-config';

@Injectable()
export class SupabaseClientService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly config = inject(SUPABASE_CONFIG, { optional: true });
  private client: SupabaseClient | null | undefined;

  configured(): boolean {
    return isSupabaseConfigured(this.config);
  }

  /** Browser-only client when URL + anon/publishable key are configured. */
  getClient(): SupabaseClient | null {
    if (!isPlatformBrowser(this.platformId)) {
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
