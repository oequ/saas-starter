import { inject, Injectable } from '@angular/core';
import {
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

function mapOrganization(row: DbOrganization): Organization {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: null,
    createdAt: row.created_at,
  };
}

function mapMember(
  row: DbOrganizationMember,
  currentUserId: string | null,
  currentEmail: string | null,
): OrganizationMember {
  const role = row.role as OrgRole;
  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.user_id === currentUserId ? (currentEmail ?? '') : '',
    displayName: null,
    role:
      role === 'owner' || role === 'admin' || role === 'member'
        ? role
        : 'member',
    status: 'active',
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
    this.syncClaims(active);
  }

  private syncClaims(active: Organization | null): void {
    if (!active) {
      this.authAdapter.setSessionClaims(null);
      return;
    }
    void this.loadMemberRole(active.id).then((role) => {
      if (!role) {
        this.authAdapter.setSessionClaims(null);
        return;
      }
      this.authAdapter.setSessionClaims({
        organizationId: active.id,
        role,
      });
    });
  }

  private async loadMemberRole(
    organizationId: OrganizationId,
  ): Promise<OrgRole | null> {
    const client = this.supabase.getClient();
    const userId = await this.currentUserId();
    if (!client || !userId) {
      return null;
    }
    const { data, error } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    const role = (data as { role: string }).role;
    return role === 'owner' || role === 'admin' || role === 'member'
      ? role
      : 'member';
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

    const { data, error } = await client
      .from('organization_members')
      .select('organization_id, user_id, role, created_at')
      .eq('organization_id', organizationId);

    if (error) {
      return supabaseErrFromPostgrest(error);
    }

    return portOk(
      (data ?? []).map((row) =>
        mapMember(row as DbOrganizationMember, currentUserId, currentEmail),
      ),
    );
  }

  async inviteMember(
    _organizationId: OrganizationId,
    _input: InviteMemberInput,
  ): Promise<PortResult<OrganizationMember>> {
    return supabaseErr('UNAVAILABLE', 'supabaseWritesNotEnabled');
  }

  async removeMember(
    _organizationId: OrganizationId,
    _userId: string,
  ): Promise<PortResult<void>> {
    return supabaseErr('UNAVAILABLE', 'supabaseWritesNotEnabled');
  }

  async updateMemberRole(
    _organizationId: OrganizationId,
    _userId: string,
    _input: UpdateMemberRoleInput,
  ): Promise<PortResult<OrganizationMember>> {
    return supabaseErr('UNAVAILABLE', 'supabaseWritesNotEnabled');
  }

  async update(
    _organizationId: OrganizationId,
    _input: UpdateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    return supabaseErr('UNAVAILABLE', 'supabaseWritesNotEnabled');
  }

  async createOrganization(
    _input: CreateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    return supabaseErr('UNAVAILABLE', 'supabaseWritesNotEnabled');
  }

  async deleteOrganization(
    _organizationId: OrganizationId,
  ): Promise<PortResult<void>> {
    return supabaseErr('UNAVAILABLE', 'supabaseWritesNotEnabled');
  }

  async selectOrganization(slug: string): Promise<PortResult<Organization>> {
    const result = await this.getBySlug(slug);
    if (!result.ok) {
      return result;
    }
    writeActiveOrgSlug(slug);
    this.activeOrganizationSubject.next(result.data);
    this.syncClaims(result.data);
    return portOk(result.data);
  }

  async selectPersonal(): Promise<PortResult<void>> {
    writeActiveOrgSlug(null);
    this.activeOrganizationSubject.next(null);
    this.authAdapter.setSessionClaims(null);
    return portOk(undefined);
  }
}

export const SUPABASE_ORG_PROVIDER = {
  provide: ORG_PORT,
  useExisting: SupabaseOrgAdapter,
};
