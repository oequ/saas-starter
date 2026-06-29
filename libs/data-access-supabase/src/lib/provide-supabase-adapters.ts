import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { provideMockIntegrationsSupport } from '@oequ/adapters-mock';
import {
  ACTIVATION_PORT,
  API_KEYS_PORT,
  BILLING_PORT,
  EMAILS_PORT,
  METRICS_PORT,
  BILLING_PROVIDER_ID,
  STRIPE_BILLING_ENABLED,
} from '@oequ/ports';
import { distinctUntilChanged, filter, map } from 'rxjs';

import { AUTH_FEATURES } from '@oequ/ports';
import {
  resolveBillingProvider,
  SUPABASE_CONFIG,
  type SupabaseConfig,
} from './supabase-config';
import { SupabaseActivationAdapter, SUPABASE_ACTIVATION_PROVIDER } from './supabase-activation.adapter';
import { SupabaseApiKeysAdapter, SUPABASE_API_KEYS_PROVIDER } from './supabase-api-keys.adapter';
import { SupabaseAuthAdapter, SUPABASE_AUTH_PROVIDER } from './supabase-auth.adapter';
import { SupabaseClientService } from './supabase-client.service';
import { SupabaseEmailsAdapter, SUPABASE_EMAILS_PROVIDER } from './supabase-emails.adapter';
import { SupabaseOrgAdapter, SUPABASE_ORG_PROVIDER } from './supabase-org.adapter';
import { WebBillingAdapter, WEB_BILLING_PROVIDER } from './web-billing.adapter';
import { WebMetricsAdapter, WEB_METRICS_PROVIDER } from './web-metrics.adapter';
import {
  SupabaseProjectAdapter,
  SUPABASE_PROJECT_PROVIDER,
} from './supabase-project.adapter';
import {
  SupabaseUsageUnitsAdapter,
  SUPABASE_USAGE_UNITS_PROVIDER,
} from './supabase-usage-units.adapter';

export function provideSupabaseAdapters(
  config: SupabaseConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SUPABASE_CONFIG, useValue: config },
    {
      provide: AUTH_FEATURES,
      useValue: {
        requireEmailConfirmation: config.requireEmailConfirmation === true,
      },
    },
    SupabaseClientService,
    SupabaseAuthAdapter,
    SupabaseOrgAdapter,
    SUPABASE_AUTH_PROVIDER,
    SUPABASE_ORG_PROVIDER,
    provideAppInitializer(() => {
      const org = inject(SupabaseOrgAdapter);
      const auth = inject(SupabaseAuthAdapter);
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

/** Supabase auth, org, billing bridge, metrics, API keys, emails, activation; mock integrations/support. */
export function provideWebAdapters(
  config: SupabaseConfig,
): EnvironmentProviders[] {
  return [
    provideSupabaseAdapters(config),
    provideMockIntegrationsSupport(),
    makeEnvironmentProviders([
      WebBillingAdapter,
      SupabaseApiKeysAdapter,
      SupabaseEmailsAdapter,
      WebMetricsAdapter,
      SupabaseActivationAdapter,
      SupabaseProjectAdapter,
      SupabaseUsageUnitsAdapter,
      WEB_BILLING_PROVIDER,
      SUPABASE_API_KEYS_PROVIDER,
      SUPABASE_EMAILS_PROVIDER,
      WEB_METRICS_PROVIDER,
      SUPABASE_ACTIVATION_PROVIDER,
      SUPABASE_PROJECT_PROVIDER,
      SUPABASE_USAGE_UNITS_PROVIDER,
      {
        provide: BILLING_PROVIDER_ID,
        useValue: resolveBillingProvider(config),
      },
      {
        provide: STRIPE_BILLING_ENABLED,
        useValue: resolveBillingProvider(config) === 'stripe',
      },
    ]),
  ];
}
