import type { AuthPort, OrgPort } from '@oequ/ports';
import {
  isSupabaseConfigured,
  SupabaseAuthAdapter,
  SupabaseClientService,
  SupabaseOrgAdapter,
  type SupabaseConfig,
} from '@oequ/data-access-supabase';
import { distinctUntilChanged, map } from 'rxjs';

import { createDemoPorts } from './create-demo-ports';

/** Ports exposed to the React shell (mock or Supabase). */
export type AppPorts = {
  auth: AuthPort;
  org: OrgPort;
};

/**
 * Composition root for real Supabase Auth/Org — plain `new`, no Angular DI.
 * Pass platform id `'browser'` so the plain client opens in the browser.
 */
export function createWebPorts(config: SupabaseConfig): AppPorts {
  if (!isSupabaseConfigured(config)) {
    throw new Error(
      'createWebPorts: Supabase URL and anon key are required (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
    );
  }

  const supabase = new SupabaseClientService('browser', config);
  const auth = new SupabaseAuthAdapter(supabase, config);
  const org = new SupabaseOrgAdapter(supabase, auth);

  auth.session$
    .pipe(
      map((session) => session?.user.id ?? null),
      distinctUntilChanged(),
    )
    .subscribe(() => {
      void org.listOrganizations();
    });

  return { auth, org };
}

export type PortsMode = 'mock' | 'supabase';

export function resolvePortsMode(
  raw: string | undefined = import.meta.env.VITE_OEQU_PORTS,
): PortsMode {
  return raw?.trim().toLowerCase() === 'supabase' ? 'supabase' : 'mock';
}

/** One composition root — React Strict Mode remounts must not spawn a second GoTrueClient. */
let cachedAppPorts: AppPorts | null = null;

export function createAppPorts(): AppPorts {
  if (cachedAppPorts) {
    return cachedAppPorts;
  }
  const mode = resolvePortsMode();
  if (mode === 'supabase') {
    const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
    const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
    cachedAppPorts = createWebPorts({ url, anonKey });
  } else {
    cachedAppPorts = createDemoPorts();
  }
  return cachedAppPorts;
}

/** Reset only for tests — production keeps one GoTrue client (Strict Mode safe). */
export function resetAppPortsForTests(): void {
  cachedAppPorts = null;
}
