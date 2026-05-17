import { Injectable } from '@angular/core';
import {
  isValidOrganizationSlug,
  ORG_PORT,
  type CreateOrganizationInput,
  type Organization,
  type OrganizationId,
  type OrganizationMember,
  type OrgPort,
  portErr,
  portOk,
  type PortResult,
  type UpdateOrganizationInput,
} from '@oequ/ports';
import { BehaviorSubject, type Observable } from 'rxjs';

import { addDaysIso } from './data/mock-billing-data';
import {
  MOCK_AUTH_SESSION,
  MOCK_MEMBERS_BY_ORG_ID,
  MOCK_ORGANIZATIONS,
} from './data/mock-data';
import { MockAuthAdapter } from './mock-auth.adapter';
import { MockBillingAdapter } from './mock-billing.adapter';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ownerMember(organizationId: OrganizationId): OrganizationMember {
  return {
    organizationId,
    userId: MOCK_AUTH_SESSION.user.id,
    email: MOCK_AUTH_SESSION.user.email,
    displayName: MOCK_AUTH_SESSION.user.displayName,
    role: 'owner',
    status: 'active',
  };
}

function cloneMembersMap(): Map<string, readonly OrganizationMember[]> {
  return new Map(
    Object.entries(MOCK_MEMBERS_BY_ORG_ID).map(([id, members]) => [
      id,
      [...members],
    ]),
  );
}

const DEMO_ZERO_ORGS_STORAGE_KEY = 'oequ-demo-zero-orgs';

function readDemoZeroOrgsFlag(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(DEMO_ZERO_ORGS_STORAGE_KEY) === '1';
}

@Injectable()
export class MockOrgAdapter implements OrgPort {
  private readonly organizationsSubject = new BehaviorSubject<
    readonly Organization[]
  >(readDemoZeroOrgsFlag() ? [] : [...MOCK_ORGANIZATIONS]);

  private readonly activeOrganizationSubject =
    new BehaviorSubject<Organization | null>(
      readDemoZeroOrgsFlag() ? null : MOCK_ORGANIZATIONS[0],
    );

  private membersByOrgId = readDemoZeroOrgsFlag()
    ? new Map<string, readonly OrganizationMember[]>()
    : cloneMembersMap();

  readonly organizations$: Observable<readonly Organization[]> =
    this.organizationsSubject.asObservable();

  readonly activeOrganization$: Observable<Organization | null> =
    this.activeOrganizationSubject.asObservable();

  constructor(
    private readonly authAdapter: MockAuthAdapter,
    private readonly billingAdapter: MockBillingAdapter,
  ) {}

  resetMockState(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DEMO_ZERO_ORGS_STORAGE_KEY);
    }
    this.organizationsSubject.next([...MOCK_ORGANIZATIONS]);
    this.membersByOrgId = cloneMembersMap();
    this.activeOrganizationSubject.next(MOCK_ORGANIZATIONS[0]);
    void this.syncPersonalClaims();
  }

  organizationCount(): number {
    return this.organizationsSubject.value.length;
  }

  /** E2E / demo: simulate a signed-in user with no workspaces yet. */
  setZeroOrganizations(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DEMO_ZERO_ORGS_STORAGE_KEY, '1');
    }
    this.organizationsSubject.next([]);
    this.membersByOrgId = new Map();
    this.activeOrganizationSubject.next(null);
    void this.syncPersonalClaims();
  }

  private async syncPersonalClaims(): Promise<void> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return;
    }
    const active = this.activeOrganizationSubject.value;
    this.authAdapter.setSession({
      user: MOCK_AUTH_SESSION.user,
      claims: {
        ...session.data,
        org: active
          ? { organizationId: active.id, role: 'owner' }
          : null,
      },
    });
  }

  async listOrganizations(): Promise<PortResult<readonly Organization[]>> {
    return portOk(this.organizationsSubject.value);
  }

  async getBySlug(slug: string): Promise<PortResult<Organization>> {
    const org = this.organizationsSubject.value.find((o) => o.slug === slug);
    if (!org) {
      return portErr({
        code: 'NOT_FOUND',
        message: `Organization not found: ${slug}`,
      });
    }
    return portOk(org);
  }

  async getMembers(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly OrganizationMember[]>> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return portErr({ code: 'UNAUTHENTICATED', message: 'Not signed in' });
    }

    return portOk(this.membersByOrgId.get(organizationId) ?? []);
  }

  async update(
    organizationId: OrganizationId,
    input: UpdateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    const orgs = this.organizationsSubject.value;
    const index = orgs.findIndex((o) => o.id === organizationId);
    if (index === -1) {
      return portErr({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    const updated: Organization = {
      ...orgs[index],
      ...input,
      name: input.name ?? orgs[index].name,
      logoUrl:
        input.logoUrl !== undefined ? input.logoUrl : orgs[index].logoUrl,
    };

    const next = [...orgs];
    next[index] = updated;
    this.organizationsSubject.next(next);

    if (this.activeOrganizationSubject.value?.id === organizationId) {
      this.activeOrganizationSubject.next(updated);
    }

    return portOk(updated);
  }

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();

    if (name.length < 2 || name.length > 64) {
      return portErr({
        code: 'VALIDATION',
        message: 'Name must be between 2 and 64 characters.',
      });
    }

    if (!isValidOrganizationSlug(slug)) {
      return portErr({
        code: 'VALIDATION',
        message:
          'Slug must be 2–48 characters: lowercase letters, numbers, and hyphens.',
      });
    }

    if (this.organizationsSubject.value.some((o) => o.slug === slug)) {
      return portErr({
        code: 'CONFLICT',
        message: 'This workspace URL is already taken.',
      });
    }

    await delay(400);

    const organization: Organization = {
      id: crypto.randomUUID(),
      slug,
      name,
      logoUrl: null,
      createdAt: new Date().toISOString(),
    };

    this.organizationsSubject.next([
      ...this.organizationsSubject.value,
      organization,
    ]);
    this.membersByOrgId.set(organization.id, [ownerMember(organization.id)]);
    this.billingAdapter.seedOrganization(organization.id);

    return portOk(organization);
  }

  async deleteOrganization(
    organizationId: OrganizationId,
  ): Promise<PortResult<void>> {
    const orgs = this.organizationsSubject.value;
    const org = orgs.find((o) => o.id === organizationId);
    if (!org) {
      return portErr({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    await delay(400);

    const remaining = orgs.filter((o) => o.id !== organizationId);
    this.organizationsSubject.next(remaining);
    this.membersByOrgId.delete(organizationId);
    this.billingAdapter.removeOrganization(organizationId);

    const wasActive = this.activeOrganizationSubject.value?.id === organizationId;
    if (!wasActive) {
      return portOk(undefined);
    }

    const nextActive = remaining[0] ?? null;
    this.activeOrganizationSubject.next(nextActive);

    const session = await this.authAdapter.getClaims();
    if (session.ok && session.data) {
      this.authAdapter.setSession({
        user: MOCK_AUTH_SESSION.user,
        claims: {
          ...session.data,
          org: nextActive
            ? { organizationId: nextActive.id, role: 'owner' }
            : null,
        },
      });
    }

    return portOk(undefined);
  }

  async selectOrganization(slug: string): Promise<PortResult<Organization>> {
    const result = await this.getBySlug(slug);
    if (!result.ok) {
      return result;
    }

    this.activeOrganizationSubject.next(result.data);

    const session = await this.authAdapter.getClaims();
    if (session.ok && session.data) {
      this.authAdapter.setSession({
        user: MOCK_AUTH_SESSION.user,
        claims: {
          ...session.data,
          org: { organizationId: result.data.id, role: 'owner' },
        },
      });
    }

    return portOk(result.data);
  }

  async selectPersonal(): Promise<PortResult<void>> {
    this.activeOrganizationSubject.next(null);

    const session = await this.authAdapter.getClaims();
    if (session.ok && session.data) {
      this.authAdapter.setSession({
        user: MOCK_AUTH_SESSION.user,
        claims: {
          ...session.data,
          org: null,
        },
      });
    }

    return portOk(undefined);
  }
}

export const MOCK_ORG_PROVIDER = {
  provide: ORG_PORT,
  useExisting: MockOrgAdapter,
};
