import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideMockNonAuthAdapters } from '@oequ/adapters-mock';
import { distinctUntilChanged, filter, map } from 'rxjs';

import {
  SUPABASE_CONFIG,
  type SupabaseConfig,
} from './supabase-config';
import { SupabaseAuthAdapter, SUPABASE_AUTH_PROVIDER } from './supabase-auth.adapter';
import { SupabaseClientService } from './supabase-client.service';
import { SupabaseOrgAdapter, SUPABASE_ORG_PROVIDER } from './supabase-org.adapter';

export function provideSupabaseAdapters(
  config: SupabaseConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SUPABASE_CONFIG, useValue: config },
    SupabaseClientService,
    SupabaseAuthAdapter,
    SupabaseOrgAdapter,
    SUPABASE_AUTH_PROVIDER,
    SUPABASE_ORG_PROVIDER,
    provideAppInitializer(() => {
      const org = inject(SupabaseOrgAdapter);
      const auth = inject(SupabaseAuthAdapter);
      // Reload orgs when the signed-in user changes — not on every session$ tick
      // (setSessionClaims after reload would otherwise loop listOrganizations).
      auth.session$
        .pipe(
          map((session) => session?.user.id ?? null),
          distinctUntilChanged(),
          filter((userId): userId is string => userId !== null),
        )
        .subscribe(() => {
          void org.listOrganizations();
        });
    }),
  ]);
}

/** Supabase auth + org; mock adapters for billing, activation, and the rest (`apps/web`). */
export function provideWebAdapters(
  config: SupabaseConfig,
): EnvironmentProviders[] {
  return [provideSupabaseAdapters(config), provideMockNonAuthAdapters()];
}
