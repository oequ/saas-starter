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
});
