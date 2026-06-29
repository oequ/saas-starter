export interface ApiConsoleNavItem {
  readonly path: string;
  readonly label: string;
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
      { path: '/overview', label: 'Overview', exact: true },
      { path: '/keys', label: 'API Keys' },
      { path: '/playground', label: 'Playground' },
      { path: '/metered-usage', label: 'Metered usage' },
      { path: '/settings', label: 'Settings' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    items: [{ path: '/docs', label: 'Get started', exact: true }],
  },
];
