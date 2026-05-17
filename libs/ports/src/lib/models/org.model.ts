export type OrganizationId = string;
export type OrgRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export interface Organization {
  readonly id: OrganizationId;
  readonly slug: string;
  readonly name: string;
  readonly logoUrl: string | null;
  readonly createdAt: string;
}

export interface OrganizationMember {
  readonly organizationId: OrganizationId;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: OrgRole;
  readonly status: MemberStatus;
}

export interface UpdateOrganizationInput {
  readonly name?: string;
  readonly logoUrl?: string | null;
}

export interface CreateOrganizationInput {
  readonly name: string;
  readonly slug: string;
}
