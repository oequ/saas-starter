import type { Provider } from '@angular/core';
import {
  type SupportPort,
  type SupportTicketInput,
  type SupportTicketResult,
  portOk,
  type PortResult,
} from '@oequ/ports';
import { provideSupportPort } from '@oequ/ports-angular';

import { mockErr } from './mock-port-error';

const MOCK_LATENCY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomTicketId(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `OEQU-${suffix}`;
}

/** Plain SupportPort mock — wire via provideMockSupport() (no @Injectable). */
export class MockSupportAdapter implements SupportPort {
  async submitTicket(
    input: SupportTicketInput,
  ): Promise<PortResult<SupportTicketResult>> {
    await delay(MOCK_LATENCY_MS);

    const subject = input.subject.trim();
    const message = input.message.trim();

    if (subject.length < 1) {
      return mockErr('VALIDATION', 'supportSubjectRequired');
    }

    if (message.length < 20) {
      return mockErr('VALIDATION', 'supportMessageMinLength');
    }

    return portOk({ ticketId: randomTicketId() });
  }
}

/** Single shared MockSupportAdapter instance for SUPPORT_PORT + concrete class token. */
export function provideMockSupport(): Provider[] {
  const support = new MockSupportAdapter();
  return [
    { provide: MockSupportAdapter, useValue: support },
    provideSupportPort(support),
  ];
}
