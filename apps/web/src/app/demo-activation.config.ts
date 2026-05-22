import type { ActivationOnboardingConfig } from '@oequ/ports';

export const DEMO_EMAIL_ACTIVATION_CONFIG: ActivationOnboardingConfig = {
  title: 'onboarding.demo.title',
  subtitle: 'onboarding.demo.subtitle',
  demoSteps: [
    {
      id: 'metrics-retrospective',
      action: 'metrics-retrospective',
      title: 'onboarding.steps.metrics.title',
      description: 'onboarding.steps.metrics.description',
      actionLabel: 'onboarding.steps.metrics.action',
    },
    {
      id: 'member-impersonation',
      action: 'member-impersonation',
      title: 'onboarding.steps.impersonation.title',
      description: 'onboarding.steps.impersonation.description',
      actionLabel: 'onboarding.steps.impersonation.action',
    },
  ],
};
