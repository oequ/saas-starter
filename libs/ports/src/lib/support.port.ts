import { InjectionToken } from '@angular/core';

import type {
  SupportTicketInput,
  SupportTicketResult,
} from './models/support.model';
import type { PortResult } from './models/common.model';

export interface SupportPort {
  submitTicket(
    input: SupportTicketInput,
  ): Promise<PortResult<SupportTicketResult>>;
}

export const SUPPORT_PORT = new InjectionToken<SupportPort>('SUPPORT_PORT');
