import { inject, Injectable } from '@angular/core';
import {
  isValidOrganizationSlug,
  ORG_PORT,
  type CreateOrganizationInput,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type Organization,
  type OrganizationId,
  type OrganizationMember,
  type OrgPort,
  type OrgRole,
  portOk,
  type PortResult,
  type UpdateOrganizationInput,
} from '@oequ/ports';
import { BehaviorSubject, type Observable } from 'rxjs';

import { SupabaseAuthAdapter } from './supabase-auth.adapter';
import { SupabaseClientService } from './supabase-client.service';
import {
  readActiveOrgSlug,
  writeActiveOrgSlug,
} from './supabase-session.mapper';
import {
  supabaseErr,
  supabaseErrFromPostgrest,
} from './supabase-port-error';
import { supabaseErrFromRpc } from './supabase-rpc-error';

interface DbOrganization {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

interface DbOrganizationMember {
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface DbOrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: string;
}

interface InviteRpcResult {
  kind: 'member' | 'invitation';
  organization_id: string;
  user_id?: string;
  email: string;
  role: string;
  status: 'active' | 'invited';
}

function mapOrganization(row: DbOrganization): Organization {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: null,
    createdAt: row.created_at,
  };
}

function parseOrgRole(role: string): OrgRole {
  return role === 'owner' || role === 'admin' || role === 'member'
    ? role
    : 'member';
}

function mapMember(
  row: DbOrganizationMember,
  currentUserId: string | null,
  currentEmail: string | null,
): OrganizationMember {
  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.user_id === currentUserId ? (currentEmail ?? '') : '',
    displayName: null,
    role: parseOrgRole(row.role),
    status: 'active',
  };
}

function mapInvitation(row: DbOrganizationInvitation): OrganizationMember {
  return {
    organizationId: row.organization_id,
    userId: row.id,
    email: row.email,
    displayName: null,
    role: parseOrgRole(row.role),
    status: 'invited',
  };
}

@Injectable()
export class SupabaseOrgAdapter implements OrgPort {
  private readonly supabase = inject(SupabaseClientService);
  private readonly authAdapter = inject(SupabaseAuthAdapter);

  private readonly organizationsSubject = new BehaviorSubject<
    readonly Organization[]
  >([]);

  private readonly activeOrganizationSubject =
    new BehaviorSubject<Organization | null>(null);

  readonly organizations$: Observable<readonly Organization[]> =
    this.organizationsSubject.asObservable();

  readonly activeOrganization$: Observable<Organization | null> =
    this.activeOrganizationSubject.asObservable();

  constructor() {
    void this.reloadFromDatabase();
  }

  private async currentUserId(): Promise<string | null> {
    const user = await this.authAdapter.getVerifiedUser();
    return user.ok && user.data ? user.data.id : null;
  }

  private async reloadFromDatabase(): Promise<void> {
    const client = this.supabase.getClient();
    if (!client) {
      return;
    }
    const userId = await this.currentUserId();
    if (!userId) {
      this.organizationsSubject.next([]);
      this.activeOrganizationSubject.next(null);
      return;
    }

    const { data, error } = await client
      .from('organizations')
      .select('id, slug, name, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return;
    }

    const organizations = (data ?? []).map((row) =>
      mapOrganization(row as DbOrganization),
    );
    this.organizationsSubject.next(organizations);

    const storedSlug = readActiveOrgSlug();
    const active =
      organizations.find((org) => org.slug === storedSlug) ??
      organizations[0] ??
      null;
    this.activeOrganizationSubject.next(active);
    await this.applyActiveOrganization(active, false, userId);
  }

  private async applyActiveOrganization(
    active: Organization | null,
    persistMetadata: boolean,
    userId?: string | null,
  ): Promise<void> {
    writeActiveOrgSlug(active?.slug ?? null);
    if (persistMetadata) {
      const persisted = await this.authAdapter.persistActiveOrgSlug(
        active?.slug ?? null,
      );
      if (!persisted.ok) {
        return;
      }
    } else {
      const uid = userId ?? (await this.currentUserId());
      const role =
        active && uid ? await this.loadMemberRole(active.id, uid) : null;
      this.authAdapter.setSessionClaims(
        active && role
          ? { organizationId: active.id, role }
          : null,
      );
    }
  }

  private async loadMemberRole(
    organizationId: OrganizationId,
    userId?: string | null,
  ): Promise<OrgRole | null> {
    const client = this.supabase.getClient();
    const uid = userId ?? (await this.currentUserId());
    if (!client || !uid) {
      return null;
    }
    const { data, error } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', uid)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return parseOrgRole((data as { role: string }).role);
  }

  async listOrganizations(): Promise<PortResult<readonly Organization[]>> {
    await this.reloadFromDatabase();
    return portOk(this.organizationsSubject.value);
  }

  async getBySlug(slug: string): Promise<PortResult<Organization>> {
    const org = this.organizationsSubject.value.find((o) => o.slug === slug);
    if (!org) {
      return supabaseErr('NOT_FOUND', 'orgNotFoundBySlug', { slug });
    }
    return portOk(org);
  }

  async getMembers(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly OrganizationMember[]>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }
    const user = await this.authAdapter.getVerifiedUser();
    const currentUserId = user.ok && user.data ? user.data.id : null;
    const currentEmail = user.ok && user.data ? user.data.email : null;

    const [membersResult, invitesResult] = await Promise.all([
      client
        .from('organization_members')
        .select('organization_id, user_id, role, created_at')
        .eq('organization_id', organizationId),
      client
        .from('organization_invitations')
        .select('id, organization_id, email, role')
        .eq('organization_id', organizationId),
    ]);

    if (membersResult.error) {
      return supabaseErrFromPostgrest(membersResult.error);
    }
    if (invitesResult.error) {
      return supabaseErrFromPostgrest(invitesResult.error);
    }

    const members = (membersResult.data ?? []).map((row) =>
      mapMember(row as DbOrganizationMember, currentUserId, currentEmail),
    );
    const invites = (invitesResult.data ?? []).map((row) =>
      mapInvitation(row as DbOrganizationInvitation),
    );

    return portOk([...members, ...invites]);
  }

  async inviteMember(
    organizationId: OrganizationId,
    input: InviteMemberInput,
  ): Promise<PortResult<OrganizationMember>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('invite_organization_member', {
      p_organization_id: organizationId,
      p_email: input.email.trim(),
      p_role: input.role,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const payload = data as InviteRpcResult;
    const member: OrganizationMember = {
      organizationId: payload.organization_id,
      userId: payload.user_id ?? crypto.randomUUID(),
      email: payload.email,
      displayName: null,
      role: parseOrgRole(payload.role),
      status: payload.status,
    };

    return portOk(member);
  }

  async removeMember(
    organizationId: OrganizationId,
    userId: string,
  ): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data: target, error: loadError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (loadError) {
      return supabaseErrFromPostgrest(loadError);
    }
    if (!target) {
      return supabaseErr('NOT_FOUND', 'memberNotFound');
    }
    if ((target as { role: string }).role === 'owner') {
      return supabaseErr('FORBIDDEN', 'ownerCannotRemove');
    }

    const { error } = await client
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      return supabaseErrFromPostgrest(error);
    }
    return portOk(undefined);
  }

  async updateMemberRole(
    organizationId: OrganizationId,
    userId: string,
    input: UpdateMemberRoleInput,
  ): Promise<PortResult<OrganizationMember>> {
    if (input.role !== 'admin' && input.role !== 'member') {
      return supabaseErr('VALIDATION', 'invalidMemberRole');
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data: existing, error: loadError } = await client
      .from('organization_members')
      .select('organization_id, user_id, role, created_at')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (loadError) {
      return supabaseErrFromPostgrest(loadError);
    }
    if (!existing) {
      return supabaseErr('NOT_FOUND', 'memberNotFound');
    }
    if ((existing as DbOrganizationMember).role === 'owner') {
      return supabaseErr('FORBIDDEN', 'ownerRoleCannotChange');
    }

    const { data, error } = await client
      .from('organization_members')
      .update({ role: input.role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select('organization_id, user_id, role, created_at')
      .single();

    if (error) {
      return supabaseErrFromPostgrest(error);
    }

    const user = await this.authAdapter.getVerifiedUser();
    const currentUserId = user.ok && user.data ? user.data.id : null;
    const currentEmail = user.ok && user.data ? user.data.email : null;

    return portOk(
      mapMember(data as DbOrganizationMember, currentUserId, currentEmail),
    );
  }

  async update(
    organizationId: OrganizationId,
    input: UpdateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const patch: { name?: string } = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 2 || name.length > 64) {
        return supabaseErr('VALIDATION', 'workspaceNameInvalid');
      }
      patch.name = name;
    }

    const { data, error } = await client
      .from('organizations')
      .update(patch)
      .eq('id', organizationId)
      .select('id, slug, name, created_at')
      .single();

    if (error) {
      return supabaseErrFromPostgrest(error);
    }

    const organization = mapOrganization(data as DbOrganization);
    const next = this.organizationsSubject.value.map((org) =>
      org.id === organizationId ? organization : org,
    );
    this.organizationsSubject.next(next);
    if (this.activeOrganizationSubject.value?.id === organizationId) {
      this.activeOrganizationSubject.next(organization);
    }

    return portOk(organization);
  }

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();

    if (name.length < 2 || name.length > 64) {
      return supabaseErr('VALIDATION', 'workspaceNameInvalid');
    }
    if (!isValidOrganizationSlug(slug)) {
      return supabaseErr('VALIDATION', 'workspaceSlugInvalid');
    }

    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const { data, error } = await client.rpc('create_organization', {
      p_name: name,
      p_slug: slug,
    });

    if (error) {
      return supabaseErrFromRpc(error);
    }

    const organization = mapOrganization(data as DbOrganization);
    this.organizationsSubject.next([
      ...this.organizationsSubject.value,
      organization,
    ]);
    await this.selectOrganization(slug);
    return portOk(organization);
  }

  async deleteOrganization(
    organizationId: OrganizationId,
  ): Promise<PortResult<void>> {
    const client = this.supabase.getClient();
    if (!client) {
      return supabaseErr('UNAVAILABLE', 'supabaseNotConfigured');
    }

    const role = await this.loadMemberRole(organizationId);
    if (role !== 'owner') {
      return supabaseErr('FORBIDDEN', 'forbidden');
    }

    const { error } = await client
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (error) {
      return supabaseErrFromPostgrest(error);
    }

    const next = this.organizationsSubject.value.filter(
      (org) => org.id !== organizationId,
    );
    this.organizationsSubject.next(next);
    if (this.activeOrganizationSubject.value?.id === organizationId) {
      this.activeOrganizationSubject.next(next[0] ?? null);
      await this.applyActiveOrganization(next[0] ?? null, true);
    }

    return portOk(undefined);
  }

  async selectOrganization(slug: string): Promise<PortResult<Organization>> {
    const result = await this.getBySlug(slug);
    if (!result.ok) {
      return result;
    }
    this.activeOrganizationSubject.next(result.data);
    await this.applyActiveOrganization(result.data, true);
    return portOk(result.data);
  }

  async selectPersonal(): Promise<PortResult<void>> {
    this.activeOrganizationSubject.next(null);
    await this.applyActiveOrganization(null, true);
    return portOk(undefined);
  }
}

export const SUPABASE_ORG_PROVIDER = {
  provide: ORG_PORT,
  useExisting: SupabaseOrgAdapter,
};
