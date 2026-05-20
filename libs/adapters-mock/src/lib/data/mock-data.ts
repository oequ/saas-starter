import type { AuthSession, AuthSessionDevice } from '@oequ/ports';
import type { Organization, OrganizationMember } from '@oequ/ports';
import {
  DEMO_AUTH_EMAIL,
  DEMO_AUTH_PASSWORD,
} from '@oequ/ports';

/** Demo login for mock adapter (shown on login screen). */
export const MOCK_DEMO_EMAIL = DEMO_AUTH_EMAIL;
export const MOCK_DEMO_PASSWORD = DEMO_AUTH_PASSWORD;

export const MOCK_ORGANIZATIONS: readonly Organization[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'parcel',
    name: 'Parcel',
    logoUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    slug: 'nova',
    name: 'Nova',
    logoUrl: null,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    slug: 'lumen',
    name: 'Lumen',
    logoUrl: null,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

export const MOCK_SESSION_DEVICES: readonly AuthSessionDevice[] = [
  {
    id: 'sess-current',
    deviceLabel: 'This device',
    browser: 'Chrome on Windows',
    location: 'Berlin, Germany',
    lastActiveAt: '2026-05-17T09:00:00.000Z',
    current: true,
  },
  {
    id: 'sess-mobile',
    deviceLabel: 'iPhone 15',
    browser: 'Safari on iOS',
    location: 'Berlin, Germany',
    lastActiveAt: '2026-05-16T18:30:00.000Z',
    current: false,
  },
  {
    id: 'sess-laptop',
    deviceLabel: 'MacBook Pro',
    browser: 'Firefox on macOS',
    location: 'Hamburg, Germany',
    lastActiveAt: '2026-05-10T11:15:00.000Z',
    current: false,
  },
];

function membersForOrg(
  organizationId: string,
  orgName: string,
): readonly OrganizationMember[] {
  return [
    {
      organizationId,
      userId: '00000000-0000-4000-8000-000000000099',
      email: 'demo@example.com',
      displayName: 'Demo User',
      role: 'owner',
      status: 'active',
    },
    {
      organizationId,
      userId: '00000000-0000-4000-8000-000000000101',
      email: 'alex@example.com',
      displayName: 'Alex Rivera',
      role: 'admin',
      status: 'active',
    },
    {
      organizationId,
      userId: '00000000-0000-4000-8000-000000000102',
      email: 'sam@example.com',
      displayName: 'Sam Chen',
      role: 'member',
      status: 'active',
    },
    {
      organizationId,
      userId: '00000000-0000-4000-8000-000000000103',
      email: 'jordan@example.com',
      displayName: null,
      role: 'member',
      status: 'invited',
    },
    {
      organizationId,
      userId: '00000000-0000-4000-8000-000000000104',
      email: `billing+${orgName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      displayName: 'Billing Contact',
      role: 'member',
      status: 'suspended',
    },
  ];
}

export const MOCK_MEMBERS_BY_ORG_ID: Readonly<
  Record<string, readonly OrganizationMember[]>
> = {
  [MOCK_ORGANIZATIONS[0].id]: membersForOrg(
    MOCK_ORGANIZATIONS[0].id,
    MOCK_ORGANIZATIONS[0].name,
  ),
  [MOCK_ORGANIZATIONS[1].id]: membersForOrg(
    MOCK_ORGANIZATIONS[1].id,
    MOCK_ORGANIZATIONS[1].name,
  ),
  [MOCK_ORGANIZATIONS[2].id]: membersForOrg(
    MOCK_ORGANIZATIONS[2].id,
    MOCK_ORGANIZATIONS[2].name,
  ),
};

export const MOCK_AUTH_SESSION: AuthSession = {
  user: {
    id: '00000000-0000-4000-8000-000000000099',
    email: 'demo@example.com',
    displayName: 'Demo User',
  },
  claims: {
    sub: '00000000-0000-4000-8000-000000000099',
    email: 'demo@example.com',
    org: {
      organizationId: MOCK_ORGANIZATIONS[0].id,
      role: 'owner',
    },
  },
};
