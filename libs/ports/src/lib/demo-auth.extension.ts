import { InjectionToken } from '@angular/core';

import type { AuthSession } from './models/auth.model';
import type { OrgRole } from './models/org.model';
import type { PortResult } from './models/common.model';

/** Demo-only — not provided in production apps. */
export interface DemoWorkspaceMemberImpersonationInput {
  readonly organizationId: string;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: OrgRole;
}

/**
 * Demo-only auth helpers (member impersonation). Omit from `app.config` in production;
 * only `provideDemoAdapters()` registers an implementation.
 */
export interface DemoAuthExtension {
  impersonateWorkspaceMember(
    input: DemoWorkspaceMemberImpersonationInput,
  ): Promise<PortResult<AuthSession>>;
}

export const DEMO_AUTH_EXTENSION = new InjectionToken<DemoAuthExtension>(
  'DEMO_AUTH_EXTENSION',
);
