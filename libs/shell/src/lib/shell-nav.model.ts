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

export const WORKSPACE_SHELL_NAV: readonly ShellNavEntry[] = [
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
    kind: 'group',
    label: 'Billing',
    icon: 'lucideCreditCard',
    basePath: '/workspace/settings/billing',
    children: [
      {
        label: 'Overview',
        path: '/workspace/settings/billing/overview',
        exact: true,
      },
      {
        label: 'Invoices',
        path: '/workspace/settings/billing/invoices',
        exact: true,
      },
      {
        label: 'Payment method',
        path: '/workspace/settings/billing/payment',
        exact: true,
      },
    ],
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
