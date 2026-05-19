export type HelpTopicCategory =
  | 'metrics'
  | 'api-keys'
  | 'members'
  | 'billing'
  | 'onboarding'
  | 'account'
  | 'general';

export interface HelpTopic {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  readonly category: HelpTopicCategory;
}

export interface HelpSystemComponent {
  readonly name: string;
  readonly status: 'operational';
  readonly detail: string;
}

export const HELP_SYSTEM_COMPONENTS: readonly HelpSystemComponent[] = [
  { name: 'Web app', status: 'operational', detail: 'Dashboard and settings' },
  { name: 'API', status: 'operational', detail: 'REST endpoints' },
  { name: 'Email delivery', status: 'operational', detail: 'Outbound sending pipeline' },
  { name: 'Authentication', status: 'operational', detail: 'Sign-in and sessions' },
];

const METRICS_TOPICS: readonly HelpTopic[] = [
  {
    id: 'metrics-deliverability',
    title: 'Understanding deliverability rate',
    summary: 'What the headline percentage means for your workspace.',
    category: 'metrics',
    paragraphs: [
      'Deliverability rate shows the share of sent emails that reached recipients without a hard bounce during the selected period.',
      'Use the period filter to compare trends over 15, 30, or 90 days. Domain filter narrows metrics to a single sending domain.',
      'A sudden drop often correlates with list quality or DNS authentication — check bounce breakdown before changing volume.',
    ],
  },
  {
    id: 'metrics-bounce',
    title: 'Bounce rate and risk threshold',
    summary: 'Transient vs permanent bounces and the risk line.',
    category: 'metrics',
    paragraphs: [
      'Bounce rate combines transient (temporary mailbox issues), permanent (invalid addresses), and undetermined bounces.',
      'The dashed risk line marks the threshold where sending reputation may be affected. Stay below it for healthy delivery.',
      'Review the breakdown legend to see which bounce type drives your rate.',
    ],
  },
];

const API_KEYS_TOPICS: readonly HelpTopic[] = [
  {
    id: 'api-keys-create',
    title: 'Creating an API key',
    summary: 'Generate a key with the right permission scope.',
    category: 'api-keys',
    paragraphs: [
      'Open API keys and choose Create API key. Pick a descriptive name your team will recognize in audit logs.',
      'Select the minimum permission needed — sending-only keys cannot manage billing or members.',
      'Copy the secret immediately after creation. For security, it is shown only once.',
    ],
  },
  {
    id: 'api-keys-revoke',
    title: 'Revoking a compromised key',
    summary: 'Rotate credentials without downtime.',
    category: 'api-keys',
    paragraphs: [
      'Create a replacement key first, update your services, then revoke the old key from the row actions menu.',
      'Revoked keys stop working instantly. Active integrations using them will receive 401 responses.',
      'Use search and permission filters to audit keys across large teams.',
    ],
  },
];

const MEMBERS_TOPICS: readonly HelpTopic[] = [
  {
    id: 'members-invite',
    title: 'Inviting teammates',
    summary: 'Send invites and assign roles.',
    category: 'members',
    paragraphs: [
      'Choose Invite member, enter an email, and select a role. Invited users appear with an Invited badge until they accept.',
      'Owners can manage billing and delete the workspace. Admins manage settings and members. Members have limited access.',
      'Use role filter and search to find people quickly in larger workspaces.',
    ],
  },
  {
    id: 'members-seats',
    title: 'Seat limits on your plan',
    summary: 'How active and invited members count toward seats.',
    category: 'members',
    paragraphs: [
      'Both active and invited members count toward your seat limit on paid plans.',
      'The toolbar shows seats used versus your plan allowance. Upgrade billing when you need more seats.',
      'Removing a member frees a seat immediately after confirmation.',
    ],
  },
];

const BILLING_TOPICS: readonly HelpTopic[] = [
  {
    id: 'billing-plans',
    title: 'Plans and upgrades',
    summary: 'Compare tiers and change subscription.',
    category: 'billing',
    paragraphs: [
      'Billing overview lists available plans with feature comparisons. Upgrade opens a confirmation dialog with proration notes.',
      'Trial workspaces show remaining trial days on the overview banner.',
      'Payment method must be on file before upgrading from trial.',
    ],
  },
  {
    id: 'billing-invoices',
    title: 'Invoices and receipts',
    summary: 'Find past charges and download PDFs.',
    category: 'billing',
    paragraphs: [
      'The Invoices tab lists date, amount, and status for each billing period.',
      'Paid invoices include a download action for your records.',
      'Billing email on the overview receives invoice notifications.',
    ],
  },
];

const ONBOARDING_TOPICS: readonly HelpTopic[] = [
  {
    id: 'onboarding-activation',
    title: 'Completing workspace activation',
    summary: 'Finish the checklist to unlock the full workspace.',
    category: 'onboarding',
    paragraphs: [
      'Activation steps guide you through domain setup, API keys, and your first send — tailored to this demo product.',
      'You can open settings pages while activation is pending; the workspace home redirects here until complete.',
      'Check off each step as you finish. Progress saves automatically in this demo environment.',
    ],
  },
];

const ACCOUNT_TOPICS: readonly HelpTopic[] = [
  {
    id: 'account-profile',
    title: 'Updating your profile',
    summary: 'Change display name and account details.',
    category: 'account',
    paragraphs: [
      'Profile settings apply to you across all workspaces — not a single organization.',
      'Display name appears in the user menu and member lists where your email is shown.',
    ],
  },
  {
    id: 'account-sessions',
    title: 'Managing active sessions',
    summary: 'Review devices and sign out remotely.',
    category: 'account',
    paragraphs: [
      'Sessions lists browsers and locations for recent sign-ins. Your current session is marked.',
      'Revoke individual sessions or sign out all other devices from the Security page.',
    ],
  },
];

export const HELP_BROWSE_TOPICS: readonly HelpTopic[] = [
  {
    id: 'general-getting-started',
    title: 'Getting started with your workspace',
    summary: 'Create a workspace and invite your team.',
    category: 'general',
    paragraphs: [
      'After sign-up you create a workspace name and slug. Slugs appear in URLs and API references.',
      'Invite teammates from Members settings. Each workspace has its own billing, API keys, and metrics.',
    ],
  },
  {
    id: 'general-security',
    title: 'Security best practices',
    summary: 'Protect API keys and member access.',
    category: 'general',
    paragraphs: [
      'Never commit API keys to source control. Use environment variables on the server.',
      'Review member roles regularly and remove inactive accounts.',
      'Enable two-factor authentication when available in your production deployment.',
    ],
  },
  {
    id: 'general-support',
    title: 'When to contact support',
    summary: 'Issues we can help with fastest.',
    category: 'general',
    paragraphs: [
      'Include your workspace slug, approximate time of the issue, and any error messages.',
      'For delivery problems, mention the domain and a sample message ID if available.',
      'Use the impact selector so we can prioritize urgent production outages.',
    ],
  },
];

const ROUTE_TOPIC_ENTRIES: readonly {
  readonly prefix: string;
  readonly topics: readonly HelpTopic[];
}[] = [
  { prefix: '/workspace/metrics', topics: METRICS_TOPICS },
  { prefix: '/workspace/api-keys', topics: API_KEYS_TOPICS },
  { prefix: '/workspace/settings/members', topics: MEMBERS_TOPICS },
  { prefix: '/workspace/settings/billing', topics: BILLING_TOPICS },
  { prefix: '/onboarding', topics: ONBOARDING_TOPICS },
  { prefix: '/account', topics: ACCOUNT_TOPICS },
];

export function topicsForRoute(url: string): readonly HelpTopic[] {
  const path = url.split('?')[0]?.split('#')[0] ?? '';
  let bestMatch: readonly HelpTopic[] = HELP_BROWSE_TOPICS.slice(0, 2);

  for (const entry of ROUTE_TOPIC_ENTRIES) {
    if (path.startsWith(entry.prefix) && entry.topics.length > 0) {
      bestMatch = entry.topics;
    }
  }

  return bestMatch;
}

export function findHelpTopicById(id: string): HelpTopic | null {
  const all = [
    ...HELP_BROWSE_TOPICS,
    ...METRICS_TOPICS,
    ...API_KEYS_TOPICS,
    ...MEMBERS_TOPICS,
    ...BILLING_TOPICS,
    ...ONBOARDING_TOPICS,
    ...ACCOUNT_TOPICS,
  ];
  return all.find((topic) => topic.id === id) ?? null;
}
