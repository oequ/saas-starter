import type { OrganizationId } from './org.model';

export type OutboundEmailStatus =
  | 'delivered'
  | 'bounced'
  | 'queued'
  | 'failed';

export type EmailListPeriod = '15d' | '30d' | '90d';

export type EmailStatusFilter = 'all' | OutboundEmailStatus;

export interface OutboundEmail {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly to: string;
  readonly subject: string;
  readonly status: OutboundEmailStatus;
  readonly sentAt: string;
  readonly apiKeyId: string | null;
  readonly apiKeyLabel: string | null;
}

export interface EmailListQuery {
  readonly search?: string;
  readonly status?: EmailStatusFilter;
  readonly period?: EmailListPeriod;
  readonly apiKeyId?: string | 'all';
}

/** Demo: spread simulated sends across a retrospective window. */
export type RetrospectiveSendPeriod = 'today' | '7d' | '30d';

export interface SimulateOutboundEmailRecord {
  readonly sentAt: string;
  readonly status?: OutboundEmailStatus;
  readonly subject?: string;
  readonly to?: string;
}

export interface SimulateOutboundEmailsInput {
  readonly count?: number;
  readonly subject?: string;
  readonly to?: string;
  /** When set, append these rows instead of generating `count` at "now". */
  readonly records?: readonly SimulateOutboundEmailRecord[];
}

export interface SimulateOutboundEmailsResult {
  readonly created: readonly OutboundEmail[];
  readonly totalSent: number;
  readonly quotaLimit: number | null;
  readonly requestedCount?: number;
  readonly capped?: boolean;
}
