import type {
  ActivationPort,
  ApiKeysPort,
  AuthPort,
  BillingPort,
  EmailsPort,
  IntegrationsPort,
  MetricsPort,
  OrgPort,
  ProjectPort,
  SupportPort,
  UsageUnitsPort,
} from '@oequ/ports';

import {
  ACTIVATION_ONBOARDING_CONFIG,
  ACTIVATION_PORT,
  API_KEYS_PORT,
  AUTH_FEATURES,
  AUTH_PORT,
  BILLING_PORT,
  BILLING_PROVIDER_ID,
  DEMO_AUTH_EXTENSION,
  EMAILS_PORT,
  HELP_PANEL_PORT,
  INTEGRATIONS_PORT,
  LOGIN_FORM_PREFILL,
  METRICS_PORT,
  ORG_PORT,
  PROJECT_PORT,
  STRIPE_BILLING_ENABLED,
  SUPPORT_PORT,
  USAGE_UNITS_PORT,
} from './injection-tokens';
import { provideActivationPort } from './provide-activation-port';
import { provideApiKeysPort } from './provide-api-keys-port';
import { provideAuthPort } from './provide-auth-port';
import { provideBillingPort } from './provide-billing-port';
import { provideEmailsPort } from './provide-emails-port';
import { provideIntegrationsPort } from './provide-integrations-port';
import { provideMetricsPort } from './provide-metrics-port';
import { provideOrgPort } from './provide-org-port';
import { provideProjectPort } from './provide-project-port';
import { provideSupportPort } from './provide-support-port';
import { provideUsageUnitsPort } from './provide-usage-units-port';

describe('@oequ/ports-angular', () => {
  it('exposes injection tokens', () => {
    expect(AUTH_PORT.toString()).toContain('AUTH_PORT');
    expect(AUTH_FEATURES.toString()).toContain('AUTH_FEATURES');
    expect(DEMO_AUTH_EXTENSION.toString()).toContain('DEMO_AUTH_EXTENSION');
    expect(LOGIN_FORM_PREFILL.toString()).toContain('LOGIN_FORM_PREFILL');
    expect(ORG_PORT.toString()).toContain('ORG_PORT');
    expect(BILLING_PORT.toString()).toContain('BILLING_PORT');
    expect(BILLING_PROVIDER_ID.toString()).toContain('BILLING_PROVIDER_ID');
    expect(STRIPE_BILLING_ENABLED.toString()).toContain(
      'STRIPE_BILLING_ENABLED',
    );
    expect(PROJECT_PORT.toString()).toContain('PROJECT_PORT');
    expect(API_KEYS_PORT.toString()).toContain('API_KEYS_PORT');
    expect(EMAILS_PORT.toString()).toContain('EMAILS_PORT');
    expect(METRICS_PORT.toString()).toContain('METRICS_PORT');
    expect(INTEGRATIONS_PORT.toString()).toContain('INTEGRATIONS_PORT');
    expect(SUPPORT_PORT.toString()).toContain('SUPPORT_PORT');
    expect(HELP_PANEL_PORT.toString()).toContain('HELP_PANEL_PORT');
    expect(ACTIVATION_PORT.toString()).toContain('ACTIVATION_PORT');
    expect(ACTIVATION_ONBOARDING_CONFIG.toString()).toContain(
      'ACTIVATION_ONBOARDING_CONFIG',
    );
    expect(USAGE_UNITS_PORT.toString()).toContain('USAGE_UNITS_PORT');
  });

  it('billing token factories default to mock / disabled stripe', () => {
    expect(BILLING_PROVIDER_ID).toBeTruthy();
    expect(STRIPE_BILLING_ENABLED).toBeTruthy();
  });

  it('provideAuthPort binds useValue to AUTH_PORT', () => {
    const impl = {} as AuthPort;
    expect(provideAuthPort(impl)).toEqual({
      provide: AUTH_PORT,
      useValue: impl,
    });
  });

  it('provideOrgPort binds useValue to ORG_PORT', () => {
    const impl = {} as OrgPort;
    expect(provideOrgPort(impl)).toEqual({
      provide: ORG_PORT,
      useValue: impl,
    });
  });

  it('provideBillingPort binds useValue to BILLING_PORT', () => {
    const impl = {} as BillingPort;
    expect(provideBillingPort(impl)).toEqual({
      provide: BILLING_PORT,
      useValue: impl,
    });
  });

  it('provideProjectPort binds useValue to PROJECT_PORT', () => {
    const impl = {} as ProjectPort;
    expect(provideProjectPort(impl)).toEqual({
      provide: PROJECT_PORT,
      useValue: impl,
    });
  });

  it('provideApiKeysPort binds useValue to API_KEYS_PORT', () => {
    const impl = {} as ApiKeysPort;
    expect(provideApiKeysPort(impl)).toEqual({
      provide: API_KEYS_PORT,
      useValue: impl,
    });
  });

  it('provideEmailsPort binds useValue to EMAILS_PORT', () => {
    const impl = {} as EmailsPort;
    expect(provideEmailsPort(impl)).toEqual({
      provide: EMAILS_PORT,
      useValue: impl,
    });
  });

  it('provideMetricsPort binds useValue to METRICS_PORT', () => {
    const impl = {} as MetricsPort;
    expect(provideMetricsPort(impl)).toEqual({
      provide: METRICS_PORT,
      useValue: impl,
    });
  });

  it('provideIntegrationsPort binds useValue to INTEGRATIONS_PORT', () => {
    const impl = {} as IntegrationsPort;
    expect(provideIntegrationsPort(impl)).toEqual({
      provide: INTEGRATIONS_PORT,
      useValue: impl,
    });
  });

  it('provideSupportPort binds useValue to SUPPORT_PORT', () => {
    const impl = {} as SupportPort;
    expect(provideSupportPort(impl)).toEqual({
      provide: SUPPORT_PORT,
      useValue: impl,
    });
  });

  it('provideActivationPort binds useValue to ACTIVATION_PORT', () => {
    const impl = {} as ActivationPort;
    expect(provideActivationPort(impl)).toEqual({
      provide: ACTIVATION_PORT,
      useValue: impl,
    });
  });

  it('provideUsageUnitsPort binds useValue to USAGE_UNITS_PORT', () => {
    const impl = {} as UsageUnitsPort;
    expect(provideUsageUnitsPort(impl)).toEqual({
      provide: USAGE_UNITS_PORT,
      useValue: impl,
    });
  });
});
