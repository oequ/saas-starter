export type HelpTopicCategory =
  | 'metrics'
  | 'api-keys'
  | 'integrations'
  | 'members'
  | 'billing'
  | 'usage'
  | 'onboarding'
  | 'account'
  | 'general';

export interface HelpTopicRef {
  readonly id: string;
  readonly category: HelpTopicCategory;
}

export interface HelpTopic {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  readonly category: HelpTopicCategory;
}

export interface HelpSystemComponentRef {
  readonly id: string;
}

const METRICS_TOPICS: readonly HelpTopicRef[] = [
  { id: 'metrics-deliverability', category: 'metrics' },
  { id: 'metrics-bounce', category: 'metrics' },
];

const API_KEYS_TOPICS: readonly HelpTopicRef[] = [
  { id: 'api-keys-create', category: 'api-keys' },
  { id: 'api-keys-revoke', category: 'api-keys' },
];

const INTEGRATIONS_TOPICS: readonly HelpTopicRef[] = [
  { id: 'integrations-connect', category: 'integrations' },
  { id: 'integrations-disconnect', category: 'integrations' },
];

const MEMBERS_TOPICS: readonly HelpTopicRef[] = [
  { id: 'members-invite', category: 'members' },
  { id: 'members-seats', category: 'members' },
];

const BILLING_TOPICS: readonly HelpTopicRef[] = [
  { id: 'billing-plans', category: 'billing' },
  { id: 'billing-invoices', category: 'billing' },
];

const USAGE_TOPICS: readonly HelpTopicRef[] = [
  { id: 'usage-summary', category: 'usage' },
  { id: 'usage-upgrade', category: 'usage' },
];

const ONBOARDING_TOPICS: readonly HelpTopicRef[] = [
  { id: 'onboarding-activation', category: 'onboarding' },
];

const ACCOUNT_TOPICS: readonly HelpTopicRef[] = [
  { id: 'account-profile', category: 'account' },
  { id: 'account-sessions', category: 'account' },
];

export const HELP_BROWSE_TOPICS: readonly HelpTopicRef[] = [
  { id: 'general-getting-started', category: 'general' },
  { id: 'general-security', category: 'general' },
  { id: 'general-support', category: 'general' },
];

export const HELP_SYSTEM_COMPONENTS: readonly HelpSystemComponentRef[] = [
  { id: 'webApp' },
  { id: 'api' },
  { id: 'emailDelivery' },
  { id: 'authentication' },
];

const ROUTE_TOPIC_ENTRIES: readonly {
  readonly prefix: string;
  readonly topics: readonly HelpTopicRef[];
}[] = [
  { prefix: '/workspace/metrics', topics: METRICS_TOPICS },
  { prefix: '/workspace/api-keys', topics: API_KEYS_TOPICS },
  { prefix: '/workspace/integrations', topics: INTEGRATIONS_TOPICS },
  { prefix: '/workspace/settings/members', topics: MEMBERS_TOPICS },
  { prefix: '/workspace/settings/billing', topics: BILLING_TOPICS },
  { prefix: '/workspace/settings/usage', topics: USAGE_TOPICS },
  { prefix: '/onboarding', topics: ONBOARDING_TOPICS },
  { prefix: '/account', topics: ACCOUNT_TOPICS },
];

const ALL_TOPIC_REFS: readonly HelpTopicRef[] = [
  ...HELP_BROWSE_TOPICS,
  ...METRICS_TOPICS,
  ...API_KEYS_TOPICS,
  ...INTEGRATIONS_TOPICS,
  ...MEMBERS_TOPICS,
  ...BILLING_TOPICS,
  ...USAGE_TOPICS,
  ...ONBOARDING_TOPICS,
  ...ACCOUNT_TOPICS,
];

export function topicsForRoute(url: string): readonly HelpTopicRef[] {
  const path = url.split('?')[0]?.split('#')[0] ?? '';
  let bestMatch: readonly HelpTopicRef[] = HELP_BROWSE_TOPICS.slice(0, 2);

  for (const entry of ROUTE_TOPIC_ENTRIES) {
    if (path.startsWith(entry.prefix) && entry.topics.length > 0) {
      bestMatch = entry.topics;
    }
  }

  return bestMatch;
}

export function findHelpTopicRefById(id: string): HelpTopicRef | null {
  return ALL_TOPIC_REFS.find((topic) => topic.id === id) ?? null;
}
