import { InjectionToken } from '@angular/core';

import type {
  EmailListQuery,
  OutboundEmail,
  SimulateOutboundEmailsInput,
  SimulateOutboundEmailsResult,
} from './models/email.model';
import type { PortResult } from './models/common.model';
import type { OrganizationId } from './models/org.model';

export interface EmailsPort {
  listOutbound(
    organizationId: OrganizationId,
    query?: EmailListQuery,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly OutboundEmail[]>>;

  /** Demo: append outbound messages and sync billing `emails_sent` usage. */
  simulateOutbound(
    organizationId: OrganizationId,
    input?: SimulateOutboundEmailsInput,
  ): Promise<PortResult<SimulateOutboundEmailsResult>>;
}

export const EMAILS_PORT = new InjectionToken<EmailsPort>('EMAILS_PORT');
