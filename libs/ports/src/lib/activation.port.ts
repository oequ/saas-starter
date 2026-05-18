import { InjectionToken } from '@angular/core';

import type { PortResult } from './models/common.model';
import type { ActivationStatus } from './models/activation.model';
import type { OrganizationId } from './models/org.model';

/**
 * Workspace activation — adopters define what "first value" means
 * (first email sent, first API call, first record created, etc.).
 */
export interface ActivationPort {
  getStatus(
    organizationId: OrganizationId,
  ): Promise<PortResult<ActivationStatus>>;

  markComplete(
    organizationId: OrganizationId,
  ): Promise<PortResult<void>>;
}

export const ACTIVATION_PORT = new InjectionToken<ActivationPort>(
  'ACTIVATION_PORT',
);
