import type { ActivationOnboardingConfig } from '@oequ/ports';

export const DEMO_EMAIL_ACTIVATION_CONFIG: ActivationOnboardingConfig = {
  title: 'Send your first email',
  subtitle:
    'Follow the steps below to complete workspace activation. Replace this flow in your app via ActivationPort and ACTIVATION_ONBOARDING_CONFIG.',
  retrospective: {
    title: 'Preview delivery metrics',
    description:
      'Backfill simulated sends over a time window and watch volume update live on the Metrics dashboard (about 2 seconds). Plan limits apply.',
    actionLabel: 'Simulate send history',
  },
  steps: [
    {
      id: 'api-key',
      kind: 'prerequisite',
      title: 'Add an API key',
      description: 'Use the following generated key to authenticate requests.',
      actionLabel: 'Add API Key',
    },
    {
      id: 'send-email',
      kind: 'complete',
      title: 'Send an email',
      description: 'Implement or run the code below to send your first email.',
      codeLanguageLabel: 'Node.js',
      codeSnippet: `import { EmailClient } from '@your-app/sdk';

const client = new EmailClient({ apiKey: 'sk_live_xxxxxxxx' });

await client.send({
  from: 'hello@your-domain.com',
  to: 'you@example.com',
  subject: 'Workspace activated',
  html: '<p>Your first outbound message is live.</p>',
});`,
      completeLabel: 'Send email',
    },
  ],
  exploreTitle: 'Explore more',
  exploreSubtitle: "Continue unlocking your workspace's full capabilities.",
  exploreCards: [
    {
      id: 'domain',
      title: 'Add a domain',
      description:
        'Verify and send emails from your own custom domains.',
      actionLabel: 'Add domain',
    },
    {
      id: 'test-emails',
      title: 'Test emails',
      description:
        'Simulate events without affecting reputation using test inboxes.',
      actionLabel: 'Learn more',
    },
    {
      id: 'deliverability',
      title: 'Deliverability tips',
      description:
        'Avoid the spam folder with dedicated IPs and best practices.',
      actionLabel: 'Learn more',
    },
  ],
};
