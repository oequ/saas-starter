import type { OrganizationId } from './org.model';

export interface UsageUnitBalance {
  readonly available: number;
  readonly monthlyAllowance: number;
  readonly resetAt: string | null;
}

export interface ApiUsageEvent {
  readonly id: string;
  readonly createdAt: string;
  readonly eventType: string;
  readonly endpoint: string;
  readonly unit: string;
  readonly quantity: number;
  readonly httpStatus: number | null;
  readonly latencyMs: number | null;
  readonly apiKeyId: string | null;
  readonly runId: string | null;
}

export interface ApiUsageEventFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

export type UsageUnitsOrganizationId = OrganizationId;
