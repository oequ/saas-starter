import type { OrganizationId } from './org.model';

export type ProjectId = string;

export type ProjectVisibility = 'invited_only';

export type ProjectMemberRole = 'owner' | 'editor' | 'viewer';

export interface OrganizationProject {
  readonly id: ProjectId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly visibility: ProjectVisibility;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectMember {
  readonly projectId: ProjectId;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: ProjectMemberRole;
  readonly createdAt: string;
}

export interface CreateProjectInput {
  readonly name: string;
  readonly slug?: string;
  readonly description?: string | null;
}

export interface UpdateProjectInput {
  readonly name?: string;
  readonly description?: string | null;
}

export interface AddProjectMemberInput {
  /** Org member user id or email (adapter resolves email to user in org). */
  readonly email: string;
  readonly role: Exclude<ProjectMemberRole, 'owner'>;
}

export interface UpdateProjectMemberRoleInput {
  readonly role: Exclude<ProjectMemberRole, 'owner'>;
}
