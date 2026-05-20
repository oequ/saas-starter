import type { OutboundEmail, OutboundEmailStatus } from '@oequ/ports';

import { MOCK_ORGANIZATIONS } from './mock-data';

const PARCEL_ID = MOCK_ORGANIZATIONS[0].id;
const NOVA_ID = MOCK_ORGANIZATIONS[1].id;

function hoursAgoIso(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

function seedEmail(
  organizationId: string,
  to: string,
  subject: string,
  hoursAgo: number,
  apiKeyLabel: string,
  status: OutboundEmailStatus = 'delivered',
): OutboundEmail {
  return {
    id: `em_${organizationId}_${hoursAgo}_${to}_${status}`,
    organizationId,
    to,
    subject,
    status,
    sentAt: hoursAgoIso(hoursAgo),
    apiKeyId: 'seed',
    apiKeyLabel,
  };
}

export const MOCK_OUTBOUND_EMAILS_BY_ORG: Readonly<
  Record<string, readonly OutboundEmail[]>
> = {
  [PARCEL_ID]: [
    seedEmail(
      PARCEL_ID,
      'alex.morgan@acme.co',
      'Your sign-in code',
      14,
      'Production',
    ),
    seedEmail(
      PARCEL_ID,
      'billing@customer.io',
      'Payment receipt',
      14.2,
      'Production',
    ),
    seedEmail(
      PARCEL_ID,
      'team@company.com',
      'Weekly activity summary',
      21,
      'Production',
    ),
    seedEmail(
      PARCEL_ID,
      'user@example.com',
      'Password reset requested',
      21.5,
      'Staging',
    ),
    seedEmail(
      PARCEL_ID,
      'notifications@product.app',
      'New comment on your project',
      36,
      'Production',
    ),
    seedEmail(
      PARCEL_ID,
      'support@client.org',
      'Ticket update: request received',
      40,
      'Production',
    ),
    seedEmail(
      PARCEL_ID,
      'alerts@acme.co',
      'Delivery failed — address not found',
      18,
      'Production',
      'bounced',
    ),
    seedEmail(
      PARCEL_ID,
      'ops@company.com',
      'Send failed — provider timeout',
      22,
      'Production',
      'failed',
    ),
  ],
  [NOVA_ID]: [
    seedEmail(
      NOVA_ID,
      'founder@startup.dev',
      'Welcome to your workspace',
      8,
      'Development',
    ),
  ],
};

export function mockOutboundEmailsForOrg(
  organizationId: string,
): readonly OutboundEmail[] {
  return (MOCK_OUTBOUND_EMAILS_BY_ORG[organizationId] ?? []).map((email) => ({
    ...email,
  }));
}
