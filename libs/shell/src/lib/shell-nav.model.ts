export interface ShellNavLink {
  readonly kind: 'link';
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly exact: boolean;
}

export interface ShellNavSubLink {
  readonly label: string;
  readonly path: string;
  readonly exact: boolean;
}

export interface ShellNavGroup {
  readonly kind: 'group';
  readonly label: string;
  readonly icon: string;
  readonly basePath: string;
  readonly children: readonly ShellNavSubLink[];
}

export type ShellNavEntry = ShellNavLink | ShellNavGroup;

/** Always first in the shell; route stays reachable after activation completes. */
export const ONBOARDING_SHELL_NAV_LINK: ShellNavLink = {
  kind: 'link',
  label: 'Onboarding',
  path: '/onboarding',
  icon: 'lucideRocket',
  exact: true,
};

export const WORKSPACE_SHELL_NAV: readonly ShellNavLink[] = [
  {
    kind: 'link',
    label: 'Metrics',
    path: '/workspace/metrics',
    icon: 'lucideBarChart2',
    exact: true,
  },
  {
    kind: 'link',
    label: 'Emails',
    path: '/workspace/emails',
    icon: 'lucideMail',
    exact: true,
  },
  {
    kind: 'link',
    label: 'API keys',
    path: '/workspace/api-keys',
    icon: 'lucideKeyRound',
    exact: true,
  },
  {
    kind: 'link',
    label: 'Integrations',
    path: '/workspace/integrations',
    icon: 'lucidePuzzle',
    exact: true,
  },
  {
    kind: 'link',
    label: 'General',
    path: '/workspace/settings/general',
    icon: 'lucideSettings',
    exact: true,
  },
  {
    kind: 'link',
    label: 'Members',
    path: '/workspace/settings/members',
    icon: 'lucideUsers',
    exact: true,
  },
  {
    kind: 'link',
    label: 'Billing',
    path: '/workspace/settings/billing',
    icon: 'lucideCreditCard',
    exact: true,
  },
  {
    kind: 'link',
    label: 'Usage',
    path: '/workspace/settings/usage',
    icon: 'lucideGauge',
    exact: true,
  },
];

export const PERSONAL_SHELL_NAV: readonly ShellNavLink[] = [
  {
    kind: 'link',
    label: 'Profile',
    path: '/account/profile',
    icon: 'lucideUser',
    exact: true,
  },
  {
    kind: 'link',
    label: 'Security',
    path: '/account/security',
    icon: 'lucideShield',
    exact: true,
  },
  {
    kind: 'link',
    label: 'Sessions',
    path: '/account/sessions',
    icon: 'lucideMonitor',
    exact: true,
  },
];
