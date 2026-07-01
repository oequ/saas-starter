export interface ApiConsoleNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly exact?: boolean;
}

export interface ApiConsoleNavSection {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ApiConsoleNavItem[];
}

/** OSS API console navigation. */
export const API_CONSOLE_NAV_SECTIONS: readonly ApiConsoleNavSection[] = [
  {
    id: 'console',
    label: 'Console',
    items: [
      { path: '/overview', label: 'Overview', icon: 'lucideLayoutDashboard', exact: true },
      { path: '/keys', label: 'API Keys', icon: 'lucideKeyRound' },
      { path: '/playground', label: 'Playground', icon: 'lucideTerminal' },
      { path: '/metered-usage', label: 'Usage', icon: 'lucideActivity' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    items: [{ path: '/docs', label: 'Get started', icon: 'lucideBookOpen', exact: true }],
  },
];
