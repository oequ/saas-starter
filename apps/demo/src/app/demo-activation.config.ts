import type { ActivationOnboardingConfig } from '@oequ/ports';

export const DEMO_EMAIL_ACTIVATION_CONFIG: ActivationOnboardingConfig = {
  title: 'Try the demo workspace',
  subtitle:
    'Explore simulated email history and member access. Replace this screen in production via ActivationPort and ACTIVATION_ONBOARDING_CONFIG.',
  demoSteps: [
    {
      id: 'metrics-retrospective',
      action: 'metrics-retrospective',
      title: 'Preview delivery metrics',
      description:
        'Backfill simulated sends over a time window and watch volume update live on the Metrics dashboard (about 2 seconds). Plan limits apply.',
      actionLabel: 'Simulate send history',
    },
    {
      id: 'member-impersonation',
      action: 'member-impersonation',
      title: 'Preview as another member',
      description:
        'Choose a workspace member (with role) and sign in as them instantly — useful for testing admin vs member access.',
      actionLabel: 'Sign in as member',
    },
  ],
};
