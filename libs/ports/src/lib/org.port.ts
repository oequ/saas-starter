import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type { PortResult } from './models/common.model';
import type {
  CreateOrganizationInput,
  Organization,
  OrganizationId,
  OrganizationMember,
  UpdateOrganizationInput,
} from './models/org.model';

/**
 * Organization / tenant boundary for B2B workspace UI.
 */
export interface OrgPort {
  readonly organizations$: Observable<readonly Organization[]>;

  readonly activeOrganization$: Observable<Organization | null>;

  listOrganizations(): Promise<PortResult<readonly Organization[]>>;

  getBySlug(slug: string): Promise<PortResult<Organization>>;

  getMembers(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly OrganizationMember[]>>;

  update(
    organizationId: OrganizationId,
    input: UpdateOrganizationInput,
  ): Promise<PortResult<Organization>>;

  createOrganization(
    input: CreateOrganizationInput,
  ): Promise<PortResult<Organization>>;

  deleteOrganization(
    organizationId: OrganizationId,
  ): Promise<PortResult<void>>;

  /**
   * Select workspace for the current user. Adapter must sync auth claims (JWT org context).
   */
  selectOrganization(slug: string): Promise<PortResult<Organization>>;

  /** Clear active workspace (personal context). Adapter must clear org claims. */
  selectPersonal(): Promise<PortResult<void>>;
}

export const ORG_PORT = new InjectionToken<OrgPort>('ORG_PORT');
