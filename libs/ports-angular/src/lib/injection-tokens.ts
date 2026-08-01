import { InjectionToken } from '@angular/core';

import type {
  ActivationOnboardingConfig,
  ActivationPort,
  ApiKeysPort,
  AuthFeatures,
  AuthPort,
  BillingPort,
  BillingProviderId,
  DemoAuthExtension,
  EmailsPort,
  HelpPanelPort,
  IntegrationsPort,
  LoginFormPrefill,
  MetricsPort,
  OrgPort,
  ProjectPort,
  SupportPort,
  UsageUnitsPort,
} from '@oequ/ports';

export const AUTH_PORT = new InjectionToken<AuthPort>('AUTH_PORT');

export const AUTH_FEATURES = new InjectionToken<AuthFeatures>('AUTH_FEATURES');

export const DEMO_AUTH_EXTENSION = new InjectionToken<DemoAuthExtension>(
  'DEMO_AUTH_EXTENSION',
);

export const LOGIN_FORM_PREFILL = new InjectionToken<LoginFormPrefill>(
  'LOGIN_FORM_PREFILL',
);

export const ORG_PORT = new InjectionToken<OrgPort>('ORG_PORT');

export const BILLING_PORT = new InjectionToken<BillingPort>('BILLING_PORT');

/** Active billing backend for `apps/web` (`mock` | `stripe` | `custom`). */
export const BILLING_PROVIDER_ID = new InjectionToken<BillingProviderId>(
  'BILLING_PROVIDER_ID',
  { factory: () => 'mock' },
);

/** True when {@link BILLING_PROVIDER_ID} is `stripe` (Checkout / Customer Portal Edge Functions). */
export const STRIPE_BILLING_ENABLED = new InjectionToken<boolean>(
  'STRIPE_BILLING_ENABLED',
  { factory: () => false },
);

export const PROJECT_PORT = new InjectionToken<ProjectPort>('PROJECT_PORT');

export const API_KEYS_PORT = new InjectionToken<ApiKeysPort>('API_KEYS_PORT');

export const EMAILS_PORT = new InjectionToken<EmailsPort>('EMAILS_PORT');

export const METRICS_PORT = new InjectionToken<MetricsPort>('METRICS_PORT');

export const INTEGRATIONS_PORT = new InjectionToken<IntegrationsPort>(
  'INTEGRATIONS_PORT',
);

export const SUPPORT_PORT = new InjectionToken<SupportPort>('SUPPORT_PORT');

export const HELP_PANEL_PORT = new InjectionToken<HelpPanelPort>(
  'HELP_PANEL_PORT',
);

export const ACTIVATION_PORT = new InjectionToken<ActivationPort>(
  'ACTIVATION_PORT',
);

export const ACTIVATION_ONBOARDING_CONFIG =
  new InjectionToken<ActivationOnboardingConfig>(
    'ACTIVATION_ONBOARDING_CONFIG',
  );

export const USAGE_UNITS_PORT = new InjectionToken<UsageUnitsPort>(
  'USAGE_UNITS_PORT',
);
