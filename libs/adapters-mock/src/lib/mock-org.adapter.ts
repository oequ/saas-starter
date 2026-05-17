import { Injectable } from '@angular/core';
import {
  ORG_PORT,
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

import { MOCK_AUTH_SESSION, MOCK_ORGANIZATIONS } from './data/mock-data';
import { MockAuthAdapter } from './mock-auth.adapter';

@Injectable()
export class MockOrgAdapter implements OrgPort {
  private readonly organizationsSubject = new BehaviorSubject<
    readonly Organization[]
  >([...MOCK_ORGANIZATIONS]);

  private readonly activeOrganizationSubject =
    new BehaviorSubject<Organization | null>(MOCK_ORGANIZATIONS[0]);

  readonly organizations$: Observable<readonly Organization[]> =
    this.organizationsSubject.asObservable();

  readonly activeOrganization$: Observable<Organization | null> =
    this.activeOrganizationSubject.asObservable();

  constructor(private readonly authAdapter: MockAuthAdapter) {}

  async listOrganizations(): Promise<PortResult<readonly Organization[]>> {
    return portOk(this.organizationsSubject.value);
  }

  async getBySlug(slug: string): Promise<PortResult<Organization>> {
    const org = this.organizationsSubject.value.find((o) => o.slug === slug);
    if (!org) {
      return portErr({ code: 'NOT_FOUND', message: `Organization not found: ${slug}` });
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

    return portOk([
      {
        organizationId,
        userId: session.data.sub,
        email: session.data.email ?? 'demo@example.com',
        displayName: 'Demo User',
        role: 'owner',
        status: 'active',
      },
    ]);
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
  useClass: MockOrgAdapter,
};
