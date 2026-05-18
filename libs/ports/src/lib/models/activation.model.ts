import type { OrganizationId } from './org.model';

export type ActivationStatus = 'pending' | 'complete';

export interface ActivationState {
  readonly organizationId: OrganizationId;
  readonly status: ActivationStatus;
}
