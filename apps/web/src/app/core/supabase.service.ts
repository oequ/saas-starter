import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private browserClient: SupabaseClient | null | undefined;

  /** Browser-only client; `null` on SSR or when env is missing. */
  getClient(): SupabaseClient | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    if (this.browserClient !== undefined) {
      return this.browserClient;
    }
    const url = import.meta.env['VITE_SUPABASE_URL'];
    const anonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];
    if (!url || !anonKey) {
      this.browserClient = null;
      return null;
    }
    this.browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return this.browserClient;
  }

  envConfigured(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    return Boolean(
      import.meta.env['VITE_SUPABASE_URL'] && import.meta.env['VITE_SUPABASE_ANON_KEY']
    );
  }
}
