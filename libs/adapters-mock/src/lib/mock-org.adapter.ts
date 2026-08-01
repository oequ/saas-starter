import { inject, Injectable } from '@angular/core';
import { countMembersTowardSeats, isValidOrganizationSlug, type CreateOrganizationInput, type InviteMemberInput, type UpdateMemberRoleInput, type Organization, type OrganizationId, type OrganizationMember, type OrgPort, portOk, type PortResult, type UpdateOrganizationInput } from '@oequ/ports';
import { ORG_PORT } from '@oequ/ports-angular';
import { BehaviorSubject, type Observable } from 'rxjs';

import {
  MOCK_AUTH_SESSION,
  MOCK_MEMBERS_BY_ORG_ID,
  MOCK_ORGANIZATIONS,
} from './data/mock-data';
import { MockAuthAdapter, orgClaimForOrganization } from './mock-auth.adapter';
import { MockActivationAdapter } from './mock-activation.adapter';
import { MockApiKeysAdapter } from './mock-api-keys.adapter';
import { MockBillingAdapter } from './mock-billing.adapter';
import { mockErr, mockErrFrom } from './mock-port-error';

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

function cloneMembersMap(): Map<string, OrganizationMember[]> {
  return new Map(
    Object.entries(MOCK_MEMBERS_BY_ORG_ID).map(([id, members]) => [
      id,
      members.map((member) => ({ ...member })),
    ]),
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

function countsTowardSeat(member: OrganizationMember): boolean {
  return member.status === 'active' || member.status === 'invited';
}

const DEMO_ZERO_ORGS_STORAGE_KEY = 'oequ-demo-zero-orgs';
const DEMO_ORGS_SNAPSHOT_KEY = 'oequ-demo-orgs-snapshot';

interface DemoOrgsSnapshot {
  organizations: Organization[];
  activeSlug: string | null;
  membersByOrgId: Record<string, OrganizationMember[]>;
}

function readDemoZeroOrgsFlag(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(DEMO_ZERO_ORGS_STORAGE_KEY) === '1';
}

function readDemoOrgsSnapshot(): DemoOrgsSnapshot | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(DEMO_ORGS_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as DemoOrgsSnapshot;
  } catch {
    return null;
  }
}

function writeDemoOrgsSnapshot(snapshot: DemoOrgsSnapshot | null): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  if (!snapshot) {
    sessionStorage.removeItem(DEMO_ORGS_SNAPSHOT_KEY);
    return;
  }
  sessionStorage.setItem(DEMO_ORGS_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function resolveInitialDemoOrgState(): {
  organizations: Organization[];
  active: Organization | null;
  membersByOrgId: Map<string, OrganizationMember[]>;
} {
  if (readDemoZeroOrgsFlag()) {
    return {
      organizations: [],
      active: null,
      membersByOrgId: new Map(),
    };
  }

  const snapshot = readDemoOrgsSnapshot();
  if (snapshot) {
    const active =
      snapshot.organizations.find((org) => org.slug === snapshot.activeSlug) ??
      snapshot.organizations[0] ??
      null;
    return {
      organizations: snapshot.organizations,
      active,
      membersByOrgId: new Map(Object.entries(snapshot.membersByOrgId)),
    };
  }

  return {
    organizations: [...MOCK_ORGANIZATIONS],
    active: MOCK_ORGANIZATIONS[0],
    membersByOrgId: cloneMembersMap(),
  };
}

@Injectable()
export class MockOrgAdapter implements OrgPort {
  private readonly initialState = resolveInitialDemoOrgState();

  private readonly organizationsSubject = new BehaviorSubject<
    readonly Organization[]
  >(this.initialState.organizations);

  private readonly activeOrganizationSubject =
    new BehaviorSubject<Organization | null>(this.initialState.active);

  private membersByOrgId = this.initialState.membersByOrgId;

  readonly organizations$: Observable<readonly Organization[]> =
    this.organizationsSubject.asObservable();

  readonly activeOrganization$: Observable<Organization | null> =
    this.activeOrganizationSubject.asObservable();

  private readonly authAdapter = inject(MockAuthAdapter);

  constructor(
    private readonly billingAdapter: MockBillingAdapter,
    private readonly activationAdapter: MockActivationAdapter,
    private readonly apiKeysAdapter: MockApiKeysAdapter,
  ) {
    this.syncAllBillingSeatUsage();
  }

  resetMockState(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DEMO_ZERO_ORGS_STORAGE_KEY);
    }
    writeDemoOrgsSnapshot(null);
    this.organizationsSubject.next([...MOCK_ORGANIZATIONS]);
    this.membersByOrgId = cloneMembersMap();
    this.syncAllBillingSeatUsage();
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
    writeDemoOrgsSnapshot(null);
    this.organizationsSubject.next([]);
    this.membersByOrgId = new Map();
    this.activeOrganizationSubject.next(null);
    void this.syncPersonalClaims();
  }

  private persistDemoSession(): void {
    if (readDemoZeroOrgsFlag()) {
      return;
    }

    const organizations = [...this.organizationsSubject.value];
    if (organizations.length === 0) {
      writeDemoOrgsSnapshot(null);
      return;
    }

    const membersByOrgId = Object.fromEntries(this.membersByOrgId.entries());
    writeDemoOrgsSnapshot({
      organizations,
      activeSlug: this.activeOrganizationSubject.value?.slug ?? null,
      membersByOrgId,
    });
  }

  private async sessionUser() {
    const user = await this.authAdapter.getVerifiedUser();
    return user.ok && user.data ? user.data : MOCK_AUTH_SESSION.user;
  }

  private async syncPersonalClaims(): Promise<void> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return;
    }
    const active = this.activeOrganizationSubject.value;
    this.authAdapter.setSession({
      user: await this.sessionUser(),
      claims: {
        ...session.data,
        org: active
          ? orgClaimForOrganization(session.data, active.id)
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
      return mockErr('NOT_FOUND', 'orgNotFoundBySlug', { slug });
    }
    return portOk(org);
  }

  async getMembers(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly OrganizationMember[]>> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return mockErr('UNAUTHENTICATED', 'notSignedIn');
    }

    return portOk(this.membersByOrgId.get(organizationId) ?? []);
  }

  async inviteMember(
    organizationId: OrganizationId,
    input: InviteMemberInput,
  ): Promise<PortResult<OrganizationMember>> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return mockErr('UNAUTHENTICATED', 'notSignedIn');
    }

    const email = normalizeInviteEmail(input.email);
    if (!EMAIL_PATTERN.test(email)) {
      return mockErr('VALIDATION', 'invalidInviteEmail');
    }

    const members = this.membersByOrgId.get(organizationId) ?? [];
    if (members.some((member) => member.email.toLowerCase() === email)) {
      return mockErr('CONFLICT', 'inviteConflict');
    }

    const billing = await this.billingAdapter.getSummary(organizationId);
    if (!billing.ok) {
      return mockErrFrom(billing.error);
    }
    const { seatsUsed, seatsLimit } = billing.data;
    if (seatsLimit !== null && seatsUsed >= seatsLimit) {
      return mockErr('SEATS_EXHAUSTED', 'seatsExhausted');
    }

    await delay(300);

    const localPart = email.split('@')[0] ?? email;
    const displayName =
      localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[.+]/g, ' ');

    const member: OrganizationMember = {
      organizationId,
      userId: crypto.randomUUID(),
      email,
      displayName,
      role: input.role,
      status: 'invited',
    };

    this.membersByOrgId.set(organizationId, [...members, member]);
    this.syncBillingSeatUsage(organizationId);

    return portOk(member);
  }

  async removeMember(
    organizationId: OrganizationId,
    userId: string,
  ): Promise<PortResult<void>> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return mockErr('UNAUTHENTICATED', 'notSignedIn');
    }

    const members = this.membersByOrgId.get(organizationId) ?? [];
    const index = members.findIndex((member) => member.userId === userId);
    if (index === -1) {
      return mockErr('NOT_FOUND', 'memberNotFound');
    }

    const target = members[index];
    if (target.role === 'owner') {
      return mockErr('FORBIDDEN', 'ownerCannotRemove');
    }

    await delay(300);

    const next = members.filter((member) => member.userId !== userId);
    this.membersByOrgId.set(organizationId, next);
    this.syncBillingSeatUsage(organizationId);

    return portOk(undefined);
  }

  async revokeInvitation(
    organizationId: OrganizationId,
    invitationId: string,
  ): Promise<PortResult<void>> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return mockErr('UNAUTHENTICATED', 'notSignedIn');
    }

    const members = this.membersByOrgId.get(organizationId) ?? [];
    const target = members.find(
      (member) => member.userId === invitationId && member.status === 'invited',
    );
    if (!target) {
      return mockErr('NOT_FOUND', 'invitationNotFound');
    }

    await delay(300);

    const next = members.filter((member) => member.userId !== invitationId);
    this.membersByOrgId.set(organizationId, next);
    this.syncBillingSeatUsage(organizationId);

    return portOk(undefined);
  }

  async updateMemberRole(
    organizationId: OrganizationId,
    userId: string,
    input: UpdateMemberRoleInput,
  ): Promise<PortResult<OrganizationMember>> {
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return mockErr('UNAUTHENTICATED', 'notSignedIn');
    }

    if (input.role !== 'admin' && input.role !== 'member') {
      return mockErr('VALIDATION', 'invalidMemberRole');
    }

    const members = this.membersByOrgId.get(organizationId) ?? [];
    const index = members.findIndex((member) => member.userId === userId);
    if (index === -1) {
      return mockErr('NOT_FOUND', 'memberNotFound');
    }

    const target = members[index];
    if (target.role === 'owner') {
      return mockErr('FORBIDDEN', 'ownerRoleCannotChange');
    }

    await delay(300);

    const updated: OrganizationMember = { ...target, role: input.role };
    const next = [...members];
    next[index] = updated;
    this.membersByOrgId.set(organizationId, next);

    return portOk(updated);
  }

  async update(
    organizationId: OrganizationId,
    input: UpdateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    const orgs = this.organizationsSubject.value;
    const index = orgs.findIndex((o) => o.id === organizationId);
    if (index === -1) {
      return mockErr('NOT_FOUND', 'orgNotFound');
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

    this.persistDemoSession();
    return portOk(updated);
  }

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<PortResult<Organization>> {
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();

    if (name.length < 2 || name.length > 64) {
      return mockErr('VALIDATION', 'workspaceNameInvalid');
    }

    if (!isValidOrganizationSlug(slug)) {
      return mockErr('VALIDATION', 'workspaceSlugInvalid');
    }

    if (this.organizationsSubject.value.some((o) => o.slug === slug)) {
      return mockErr('CONFLICT', 'workspaceSlugTaken');
    }

    await delay(400);

    const organization: Organization = {
      id: crypto.randomUUID(),
      slug,
      name,
      logoUrl: null,
      createdAt: new Date().toISOString(),
    };

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DEMO_ZERO_ORGS_STORAGE_KEY);
    }

    this.organizationsSubject.next([
      ...this.organizationsSubject.value,
      organization,
    ]);
    this.membersByOrgId.set(organization.id, [ownerMember(organization.id)]);
    this.billingAdapter.seedOrganization(organization.id);
    this.activationAdapter.seedPending(organization.id);
    this.persistDemoSession();

    return portOk(organization);
  }

  async deleteOrganization(
    organizationId: OrganizationId,
  ): Promise<PortResult<void>> {
    const orgs = this.organizationsSubject.value;
    const org = orgs.find((o) => o.id === organizationId);
    if (!org) {
      return mockErr('NOT_FOUND', 'orgNotFound');
    }

    await delay(400);

    const remaining = orgs.filter((o) => o.id !== organizationId);
    this.organizationsSubject.next(remaining);
    this.membersByOrgId.delete(organizationId);
    this.billingAdapter.removeOrganization(organizationId);
    this.activationAdapter.clearOrganization(organizationId);
    this.apiKeysAdapter.clearOrganization(organizationId);

    const wasActive = this.activeOrganizationSubject.value?.id === organizationId;
    if (!wasActive) {
      return portOk(undefined);
    }

    const nextActive = remaining[0] ?? null;
    this.activeOrganizationSubject.next(nextActive);

    const session = await this.authAdapter.getClaims();
    if (session.ok && session.data) {
      this.authAdapter.setSession({
        user: await this.sessionUser(),
        claims: {
          ...session.data,
          org: nextActive
            ? orgClaimForOrganization(session.data, nextActive.id)
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
        user: await this.sessionUser(),
        claims: {
          ...session.data,
          org: orgClaimForOrganization(session.data, result.data.id),
        },
      });
    }

    this.persistDemoSession();
    return portOk(result.data);
  }

  async selectPersonal(): Promise<PortResult<void>> {
    this.activeOrganizationSubject.next(null);

    const session = await this.authAdapter.getClaims();
    if (session.ok && session.data) {
      this.authAdapter.setSession({
        user: await this.sessionUser(),
        claims: {
          ...session.data,
          org: null,
        },
      });
    }

    this.persistDemoSession();
    return portOk(undefined);
  }

  private syncBillingSeatUsage(organizationId: OrganizationId): void {
    const members = this.membersByOrgId.get(organizationId) ?? [];
    this.billingAdapter.syncSeatsUsed(
      organizationId,
      countMembersTowardSeats(members),
    );
  }

  private syncAllBillingSeatUsage(): void {
    for (const org of this.organizationsSubject.value) {
      this.syncBillingSeatUsage(org.id);
    }
  }
}

export const MOCK_ORG_PROVIDER = {
  provide: ORG_PORT,
  useExisting: MockOrgAdapter,
};
