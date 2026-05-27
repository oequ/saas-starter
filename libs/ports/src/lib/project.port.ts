import { InjectionToken } from '@angular/core';

import type { PortResult } from './models/common.model';
import type { OrganizationId } from './models/org.model';
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  OrganizationProject,
  ProjectId,
  ProjectMember,
  UpdateProjectInput,
  UpdateProjectMemberRoleInput,
} from './models/project.model';

/**
 * Optional scoped workspaces under an organization (projects, boards, campaigns).
 * Access is per-project via `project_members`, not automatic for all org members.
 */
export interface ProjectPort {
  listProjects(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly OrganizationProject[]>>;

  getProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<OrganizationProject>>;

  createProject(
    organizationId: OrganizationId,
    input: CreateProjectInput,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<OrganizationProject>>;

  updateProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
    input: UpdateProjectInput,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<OrganizationProject>>;

  deleteProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<void>>;

  listProjectMembers(
    organizationId: OrganizationId,
    projectId: ProjectId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly ProjectMember[]>>;

  addProjectMember(
    organizationId: OrganizationId,
    projectId: ProjectId,
    input: AddProjectMemberInput,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<ProjectMember>>;

  updateProjectMemberRole(
    organizationId: OrganizationId,
    projectId: ProjectId,
    userId: string,
    input: UpdateProjectMemberRoleInput,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<ProjectMember>>;

  removeProjectMember(
    organizationId: OrganizationId,
    projectId: ProjectId,
    userId: string,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<void>>;
}

export const PROJECT_PORT = new InjectionToken<ProjectPort>('PROJECT_PORT');
