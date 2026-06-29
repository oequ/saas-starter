import type { OrganizationId } from '@oequ/ports';

export function formatProjectPublicId(organizationId: OrganizationId): string {
  const hex = organizationId.replace(/-/g, '').slice(0, 12);
  return `proj_${hex}`;
}
