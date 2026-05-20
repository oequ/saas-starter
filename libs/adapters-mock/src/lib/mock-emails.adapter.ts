import { Injectable } from '@angular/core';
import {
  EMAILS_PORT,
  type EmailListQuery,
  type EmailsPort,
  emailPeriodCutoffIso,
  type OutboundEmail,
  type OrganizationId,
  portErr,
  portOk,
  type PortResult,
  resolveCurrentPlanId,
  type SimulateOutboundEmailsInput,
  type SimulateOutboundEmailsResult,
} from '@oequ/ports';

import { MockApiKeysAdapter } from './mock-api-keys.adapter';
import { MockAuthAdapter } from './mock-auth.adapter';
import { MockBillingAdapter } from './mock-billing.adapter';
import {
  billableOutboundCount,
  countBillableEmailsToday,
  emailQuotaForPlan,
} from './email-usage-stats';
import {
  mockOutboundEmailsForOrg,
  MOCK_OUTBOUND_EMAILS_BY_ORG,
} from './data/mock-emails-data';

const DEMO_EMAILS_SNAPSHOT_KEY = 'oequ-demo-emails-snapshot';

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function readSnapshot(): Record<string, readonly OutboundEmail[]> | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(DEMO_EMAILS_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Record<string, readonly OutboundEmail[]>;
  } catch {
    return null;
  }
}

function writeSnapshot(record: Record<string, readonly OutboundEmail[]>): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(DEMO_EMAILS_SNAPSHOT_KEY, JSON.stringify(record));
}

function matchesQuery(email: OutboundEmail, query?: EmailListQuery): boolean {
  if (!query) {
    return true;
  }
  if (query.status && query.status !== 'all' && email.status !== query.status) {
    return false;
  }
  if (query.apiKeyId && query.apiKeyId !== 'all') {
    if (email.apiKeyId !== query.apiKeyId) {
      return false;
    }
  }
  if (query.period) {
    const cutoff = emailPeriodCutoffIso(query.period);
    if (email.sentAt < cutoff) {
      return false;
    }
  }
  const search = query.search?.trim().toLowerCase();
  if (search) {
    const haystack = `${email.to} ${email.subject}`.toLowerCase();
    if (!haystack.includes(search)) {
      return false;
    }
  }
  return true;
}

@Injectable()
export class MockEmailsAdapter implements EmailsPort {
  private readonly store = new Map<string, OutboundEmail[]>(
    Object.entries(MOCK_OUTBOUND_EMAILS_BY_ORG).map(([orgId, emails]) => [
      orgId,
      emails.map((email) => ({ ...email })),
    ]),
  );

  constructor(
    private readonly authAdapter: MockAuthAdapter,
    private readonly billingAdapter: MockBillingAdapter,
    private readonly apiKeysAdapter: MockApiKeysAdapter,
  ) {
    const snapshot = readSnapshot();
    if (snapshot) {
      for (const [orgId, emails] of Object.entries(snapshot)) {
        this.store.set(orgId, emails.map((email) => ({ ...email })));
      }
    }
    this.syncAllOrgMeters();
  }

  /** Source of truth for metrics and billing `emails_sent` usage. */
  outboundSnapshot(organizationId: OrganizationId): readonly OutboundEmail[] {
    return this.getEmails(organizationId).map((email) => ({ ...email }));
  }

  resetMockState(): void {
    this.store.clear();
    for (const orgId of Object.keys(MOCK_OUTBOUND_EMAILS_BY_ORG)) {
      this.store.set(orgId, mockOutboundEmailsForOrg(orgId).map((e) => ({ ...e })));
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DEMO_EMAILS_SNAPSHOT_KEY);
    }
    this.syncAllOrgMeters();
  }

  async listOutbound(
    organizationId: OrganizationId,
    query?: EmailListQuery,
    abortSignal?: AbortSignal,
  ): Promise<PortResult<readonly OutboundEmail[]>> {
    await delay(200, abortSignal);
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return portErr({ code: 'UNAUTHENTICATED', message: 'Not signed in' });
    }

    const emails = this.getEmails(organizationId)
      .filter((email) => matchesQuery(email, query))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));

    return portOk(emails);
  }

  async simulateOutbound(
    organizationId: OrganizationId,
    input?: SimulateOutboundEmailsInput,
  ): Promise<PortResult<SimulateOutboundEmailsResult>> {
    await delay(500);
    const session = await this.authAdapter.getClaims();
    if (!session.ok || !session.data) {
      return portErr({ code: 'UNAUTHENTICATED', message: 'Not signed in' });
    }

    const count = Math.min(Math.max(input?.count ?? 8, 1), 50);
    const billing = await this.billingAdapter.getSummary(organizationId);
    if (!billing.ok) {
      return portErr(billing.error);
    }

    const meter = billing.data.meters.find((m) => m.metricId === 'emails_sent');
    const emails = this.getEmails(organizationId);
    const monthlyCount = billableOutboundCount(emails);
    const todayCount = countBillableEmailsToday(emails);
    const planId = resolveCurrentPlanId(billing.data);
    const quota = emailQuotaForPlan(planId);
    const monthlyLimit = meter?.limit ?? quota.monthlyLimit;
    const dailyLimit = meter?.dailyLimit ?? quota.dailyLimit;

    if (monthlyLimit !== null && monthlyCount + count > monthlyLimit) {
      return portErr({
        code: 'RATE_LIMITED',
        message: `Monthly email quota exceeded (${monthlyCount} / ${monthlyLimit}). Upgrade on Usage or Billing.`,
      });
    }

    if (dailyLimit !== null && todayCount + count > dailyLimit) {
      return portErr({
        code: 'RATE_LIMITED',
        message: `Daily email limit exceeded (${todayCount} / ${dailyLimit} today). Free plan allows 100 emails per day.`,
      });
    }

    const keys = await this.apiKeysAdapter.listKeys(organizationId);
    const apiKey = keys.ok && keys.data.length > 0 ? keys.data[0] : null;

    const subject =
      input?.subject?.trim() || 'Welcome — your account is ready';
    const to = input?.to?.trim() || 'customer@example.com';

    const created: OutboundEmail[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      created.push({
        id: `em_${organizationId}_${now}_${i}`,
        organizationId,
        to,
        subject,
        status: 'delivered',
        sentAt: new Date(now - i * 45_000).toISOString(),
        apiKeyId: apiKey?.id ?? null,
        apiKeyLabel: apiKey?.name ?? 'Simulated',
      });
    }

    const next = [...created, ...this.getEmails(organizationId)];
    this.store.set(organizationId, next);
    this.persist();
    this.syncOrgMeter(organizationId);

    return portOk({
      created,
      totalSent: next.length,
      quotaLimit: monthlyLimit,
    });
  }

  private getEmails(organizationId: OrganizationId): OutboundEmail[] {
    let emails = this.store.get(organizationId);
    if (!emails) {
      emails = mockOutboundEmailsForOrg(organizationId).map((email) => ({
        ...email,
      }));
      this.store.set(organizationId, emails);
    }
    return emails;
  }

  private persist(): void {
    const record: Record<string, readonly OutboundEmail[]> = {};
    for (const [orgId, emails] of this.store.entries()) {
      record[orgId] = emails;
    }
    writeSnapshot(record);
  }

  private syncOrgMeter(organizationId: OrganizationId): void {
    const emails = this.getEmails(organizationId);
    this.billingAdapter.syncMeterConsumed(
      organizationId,
      'emails_sent',
      billableOutboundCount(emails),
      countBillableEmailsToday(emails),
    );
  }

  private syncAllOrgMeters(): void {
    for (const orgId of this.store.keys()) {
      this.syncOrgMeter(orgId);
    }
  }
}

export const MOCK_EMAILS_PROVIDER = {
  provide: EMAILS_PORT,
  useExisting: MockEmailsAdapter,
};
