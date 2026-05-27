import { Injectable } from '@angular/core';
import {
  PROJECT_PORT,
  type AddProjectMemberInput,
  type CreateProjectInput,
  type OrganizationId,
  type OrganizationProject,
  type ProjectId,
  type ProjectMember,
  type ProjectPort,
  portOk,
  type PortResult,
  type UpdateProjectInput,
  type UpdateProjectMemberRoleInput,
} from '@oequ/ports';

import { cloneMockProjectsSeed } from './data/mock-projects-data';
import { mockErr } from './mock-port-error';

const MOCK_LATENCY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `proj-${Date.now()}`;
}

@Injectable()
export class MockProjectAdapter implements ProjectPort {
  private seed = cloneMockProjectsSeed();

  resetMockState(): void {
    this.seed = cloneMockProjectsSeed();
  }

  private projectsForOrg(orgId: OrganizationId): OrganizationProject[] {
    return this.seed.projects.filter((p) => p.organizationId === orgId);
  }

  private membersForProject(projectId: ProjectId): ProjectMember[] {
    return this.seed.members.filter((m) => m.projectId === projectId);
  }

  async listProjects(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly OrganizationProject[]>> {
    await delay(MOCK_LATENCY_MS);
    return portOk(this.projectsForOrg(organizationId).map((p) => ({ ...p })));
  }

  async getProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
  ): Promise<PortResult<OrganizationProject>> {
    await delay(MOCK_LATENCY_MS);
    const project = this.projectsForOrg(organizationId).find((p) => p.id === projectId);
    if (!project) {
      return mockErr('NOT_FOUND', 'projectNotFound');
    }
    return portOk({ ...project });
  }

  async createProject(
    organizationId: OrganizationId,
    input: CreateProjectInput,
  ): Promise<PortResult<OrganizationProject>> {
    await delay(MOCK_LATENCY_MS);
    const slug = slugify(input.slug ?? input.name);
    if (this.projectsForOrg(organizationId).some((p) => p.slug === slug)) {
      return mockErr('CONFLICT', 'projectSlugTaken');
    }
    const now = new Date().toISOString();
    const project: OrganizationProject = {
      id: randomId(),
      organizationId,
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      visibility: 'invited_only',
      createdBy: '00000000-0000-4000-8000-000000000099',
      createdAt: now,
      updatedAt: now,
    };
    this.seed.projects.push(project);
    this.seed.members.push({
      projectId: project.id,
      userId: project.createdBy,
      email: 'demo@example.com',
      displayName: 'Demo User',
      role: 'owner',
      createdAt: now,
    });
    return portOk({ ...project });
  }

  async updateProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
    input: UpdateProjectInput,
  ): Promise<PortResult<OrganizationProject>> {
    await delay(MOCK_LATENCY_MS);
    const index = this.seed.projects.findIndex(
      (p) => p.id === projectId && p.organizationId === organizationId,
    );
    if (index < 0) {
      return mockErr('NOT_FOUND', 'projectNotFound');
    }
    const current = this.seed.projects[index];
    const updated: OrganizationProject = {
      ...current,
      name: input.name?.trim() ?? current.name,
      description:
        input.description !== undefined ? input.description : current.description,
      updatedAt: new Date().toISOString(),
    };
    this.seed.projects[index] = updated;
    return portOk({ ...updated });
  }

  async deleteProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
  ): Promise<PortResult<void>> {
    await delay(MOCK_LATENCY_MS);
    const before = this.seed.projects.length;
    this.seed.projects = this.seed.projects.filter(
      (p) => !(p.id === projectId && p.organizationId === organizationId),
    );
    if (this.seed.projects.length === before) {
      return mockErr('NOT_FOUND', 'projectNotFound');
    }
    this.seed.members = this.seed.members.filter((m) => m.projectId !== projectId);
    return portOk(undefined);
  }

  async listProjectMembers(
    organizationId: OrganizationId,
    projectId: ProjectId,
  ): Promise<PortResult<readonly ProjectMember[]>> {
    await delay(MOCK_LATENCY_MS);
    const project = this.projectsForOrg(organizationId).find((p) => p.id === projectId);
    if (!project) {
      return mockErr('NOT_FOUND', 'projectNotFound');
    }
    return portOk(this.membersForProject(projectId).map((m) => ({ ...m })));
  }

  async addProjectMember(
    organizationId: OrganizationId,
    projectId: ProjectId,
    input: AddProjectMemberInput,
  ): Promise<PortResult<ProjectMember>> {
    await delay(MOCK_LATENCY_MS);
    const project = this.projectsForOrg(organizationId).find((p) => p.id === projectId);
    if (!project) {
      return mockErr('NOT_FOUND', 'projectNotFound');
    }
    const email = input.email.trim().toLowerCase();
    const member: ProjectMember = {
      projectId,
      userId: randomId(),
      email,
      displayName: email.split('@')[0],
      role: input.role,
      createdAt: new Date().toISOString(),
    };
    this.seed.members = this.seed.members.filter(
      (m) => !(m.projectId === projectId && m.email === email),
    );
    this.seed.members.push(member);
    return portOk({ ...member });
  }

  async updateProjectMemberRole(
    organizationId: OrganizationId,
    projectId: ProjectId,
    userId: string,
    input: UpdateProjectMemberRoleInput,
  ): Promise<PortResult<ProjectMember>> {
    await delay(MOCK_LATENCY_MS);
    if (!this.projectsForOrg(organizationId).some((p) => p.id === projectId)) {
      return mockErr('NOT_FOUND', 'projectNotFound');
    }
    const index = this.seed.members.findIndex(
      (m) => m.projectId === projectId && m.userId === userId,
    );
    if (index < 0) {
      return mockErr('NOT_FOUND', 'projectMemberNotFound');
    }
    if (this.seed.members[index].role === 'owner') {
      return mockErr('CONFLICT', 'projectOwnerRoleImmutable');
    }
    const updated = { ...this.seed.members[index], role: input.role };
    this.seed.members[index] = updated;
    return portOk({ ...updated });
  }

  async removeProjectMember(
    organizationId: OrganizationId,
    projectId: ProjectId,
    userId: string,
  ): Promise<PortResult<void>> {
    await delay(MOCK_LATENCY_MS);
    if (!this.projectsForOrg(organizationId).some((p) => p.id === projectId)) {
      return mockErr('NOT_FOUND', 'projectNotFound');
    }
    const target = this.seed.members.find(
      (m) => m.projectId === projectId && m.userId === userId,
    );
    if (!target) {
      return mockErr('NOT_FOUND', 'projectMemberNotFound');
    }
    if (target.role === 'owner') {
      const owners = this.seed.members.filter(
        (m) => m.projectId === projectId && m.role === 'owner',
      );
      if (owners.length <= 1) {
        return mockErr('CONFLICT', 'projectLastOwner');
      }
    }
    this.seed.members = this.seed.members.filter(
      (m) => !(m.projectId === projectId && m.userId === userId),
    );
    return portOk(undefined);
  }
}

export const MOCK_PROJECT_PROVIDER = {
  provide: PROJECT_PORT,
  useExisting: MockProjectAdapter,
};
