import type { AuthSession } from '@oequ/ports';
import type { Organization } from '@oequ/ports';

export const MOCK_ORGANIZATIONS: readonly Organization[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'acme',
    name: 'Acme Corp',
    logoUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    slug: 'globex',
    name: 'Globex',
    logoUrl: null,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];

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
