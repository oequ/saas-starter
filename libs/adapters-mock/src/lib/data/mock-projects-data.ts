import type { OrganizationProject, ProjectMember } from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './mock-data';

const parcelId = MOCK_ORGANIZATIONS[0].id;
const novaId = MOCK_ORGANIZATIONS[1].id;

export const MOCK_PROJECTS: readonly OrganizationProject[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    organizationId: parcelId,
    name: 'Brand Campaign',
    slug: 'brand-campaign',
    description: 'Q2 marketing assets',
    visibility: 'invited_only',
    createdBy: '00000000-0000-4000-8000-000000000099',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    organizationId: parcelId,
    name: 'Product Shots',
    slug: 'product-shots',
    description: null,
    visibility: 'invited_only',
    createdBy: '00000000-0000-4000-8000-000000000099',
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000201',
    organizationId: novaId,
    name: 'Launch Video',
    slug: 'launch-video',
    description: 'Nova launch reel',
    visibility: 'invited_only',
    createdBy: '00000000-0000-4000-8000-000000000099',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

export const MOCK_PROJECT_MEMBERS: readonly ProjectMember[] = [
  {
    projectId: '00000000-0000-4000-8000-000000000101',
    userId: '00000000-0000-4000-8000-000000000099',
    email: 'demo@example.com',
    displayName: 'Demo User',
    role: 'owner',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    projectId: '00000000-0000-4000-8000-000000000102',
    userId: '00000000-0000-4000-8000-000000000099',
    email: 'demo@example.com',
    displayName: 'Demo User',
    role: 'owner',
    createdAt: '2026-02-10T00:00:00.000Z',
  },
  {
    projectId: '00000000-0000-4000-8000-000000000201',
    userId: '00000000-0000-4000-8000-000000000099',
    email: 'demo@example.com',
    displayName: 'Demo User',
    role: 'owner',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
];

export function cloneMockProjectsSeed(): {
  projects: OrganizationProject[];
  members: ProjectMember[];
} {
  return {
    projects: MOCK_PROJECTS.map((p) => ({ ...p })),
    members: MOCK_PROJECT_MEMBERS.map((m) => ({ ...m })),
  };
}
