import { Injectable } from '@angular/core';
import {
  SUPPORT_PORT,
  type SupportPort,
  type SupportTicketInput,
  type SupportTicketResult,
  portErr,
  portOk,
  type PortResult,
} from '@oequ/ports';

const MOCK_LATENCY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomTicketId(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `OEQU-${suffix}`;
}

@Injectable()
export class MockSupportAdapter implements SupportPort {
  async submitTicket(
    input: SupportTicketInput,
  ): Promise<PortResult<SupportTicketResult>> {
    await delay(MOCK_LATENCY_MS);

    const subject = input.subject.trim();
    const message = input.message.trim();

    if (subject.length < 1) {
      return portErr({
        code: 'VALIDATION',
        message: 'Subject is required.',
      });
    }

    if (message.length < 20) {
      return portErr({
        code: 'VALIDATION',
        message: 'Message must be at least 20 characters.',
      });
    }

    return portOk({ ticketId: randomTicketId() });
  }
}

export const MOCK_SUPPORT_PROVIDER = {
  provide: SUPPORT_PORT,
  useExisting: MockSupportAdapter,
};
