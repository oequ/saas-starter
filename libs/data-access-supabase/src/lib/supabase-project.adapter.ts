import { inject, Injectable } from '@angular/core';
import { type AddProjectMemberInput, type CreateProjectInput, type OrganizationId, type OrganizationProject, type ProjectId, type ProjectMember, type ProjectMemberRole, type ProjectPort, portOk, type PortResult, type UpdateProjectInput, type UpdateProjectMemberRoleInput } from '@oequ/ports';
import { PROJECT_PORT } from '@oequ/ports-angular';

import { SupabaseClientService } from './supabase-client.service';
import { supabaseErr } from './supabase-port-error';
import { supabaseErrFromRpc } from './supabase-rpc-error';

interface DbProjectRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: OrganizationProject['visibility'];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DbProjectMemberRow {
  project_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: ProjectMemberRole;
  created_at: string;
}

function mapProject(row: DbProjectRow): OrganizationProject {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: DbProjectMemberRow): ProjectMember {
  return {
    projectId: row.project_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
  };
}

@Injectable()
export class SupabaseProjectAdapter implements ProjectPort {
  private readonly supabase = inject(SupabaseClientService);

  async listProjects(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly OrganizationProject[]>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('list_organization_projects', {
      p_organization_id: organizationId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const rows = (data ?? []) as DbProjectRow[];
    return portOk(rows.map(mapProject));
  }

  async getProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
  ): Promise<PortResult<OrganizationProject>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client
      .from('organization_projects')
      .select('*')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      return supabaseErrFromRpc(error);
    }
    if (!data) {
      return supabaseErr('NOT_FOUND', 'projectNotFound');
    }

    return portOk(mapProject(data as DbProjectRow));
  }

  async createProject(
    organizationId: OrganizationId,
    input: CreateProjectInput,
  ): Promise<PortResult<OrganizationProject>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('create_organization_project', {
      p_organization_id: organizationId,
      p_name: input.name,
      p_slug: input.slug ?? null,
      p_description: input.description ?? null,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(mapProject(data as DbProjectRow));
  }

  async updateProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
    input: UpdateProjectInput,
  ): Promise<PortResult<OrganizationProject>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('update_organization_project', {
      p_organization_id: organizationId,
      p_project_id: projectId,
      p_name: input.name ?? null,
      p_description: input.description ?? null,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(mapProject(data as DbProjectRow));
  }

  async deleteProject(
    organizationId: OrganizationId,
    projectId: ProjectId,
  ): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { error } = await client.rpc('delete_organization_project', {
      p_organization_id: organizationId,
      p_project_id: projectId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(undefined);
  }

  async listProjectMembers(
    organizationId: OrganizationId,
    projectId: ProjectId,
  ): Promise<PortResult<readonly ProjectMember[]>> {
    void organizationId;
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('list_project_members', {
      p_project_id: projectId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const rows = (data ?? []) as DbProjectMemberRow[];
    return portOk(rows.map(mapMember));
  }

  async addProjectMember(
    organizationId: OrganizationId,
    projectId: ProjectId,
    input: AddProjectMemberInput,
  ): Promise<PortResult<ProjectMember>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('add_project_member', {
      p_organization_id: organizationId,
      p_project_id: projectId,
      p_email: input.email,
      p_role: input.role,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(mapMember(data as DbProjectMemberRow));
  }

  async updateProjectMemberRole(
    organizationId: OrganizationId,
    projectId: ProjectId,
    userId: string,
    input: UpdateProjectMemberRoleInput,
  ): Promise<PortResult<ProjectMember>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('update_project_member_role', {
      p_organization_id: organizationId,
      p_project_id: projectId,
      p_user_id: userId,
      p_role: input.role,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(mapMember(data as DbProjectMemberRow));
  }

  async removeProjectMember(
    organizationId: OrganizationId,
    projectId: ProjectId,
    userId: string,
  ): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { error } = await client.rpc('remove_project_member', {
      p_organization_id: organizationId,
      p_project_id: projectId,
      p_user_id: userId,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    return portOk(undefined);
  }
}

export const SUPABASE_PROJECT_PROVIDER = {
  provide: PROJECT_PORT,
  useExisting: SupabaseProjectAdapter,
};
