import { InjectionToken } from '@angular/core';

import type { PortResult } from './models/common.model';
import type { OrganizationId } from './models/org.model';
import type {
  ApiUsageEvent,
  ApiUsageEventFilter,
  UsageUnitBalance,
} from './models/usage-units.model';

export interface UsageUnitsPort {
  getBalance(
    organizationId: OrganizationId,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<UsageUnitBalance>>;

  listApiUsageEvents(
    organizationId: OrganizationId,
    filter?: ApiUsageEventFilter,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly ApiUsageEvent[]>>;
}

export const USAGE_UNITS_PORT = new InjectionToken<UsageUnitsPort>(
  'USAGE_UNITS_PORT',
);
