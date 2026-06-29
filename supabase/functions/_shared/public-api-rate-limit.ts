import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

import {
  publicApiErrorResponse,
  publicApiErrorResponseWithHeaders,
} from './public-api-errors.ts';
import { publicApiLog } from './public-api-log.ts';
import type { PublicApiRoute } from './public-api-router.ts';

export type PublicApiRateRouteClass = 'read' | 'write';

const DEFAULT_READ_PER_MIN = 120;
const DEFAULT_WRITE_PER_MIN = 20;

export function isPublicApiRateLimitDisabled(): boolean {
  return Deno.env.get('PUBLIC_API_RATE_LIMIT_DISABLED') === 'true';
}

function parseLimit(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt((raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function publicApiRateLimitForClass(
  routeClass: PublicApiRateRouteClass,
): number {
  if (routeClass === 'write') {
    return parseLimit(
      Deno.env.get('PUBLIC_API_RATE_LIMIT_WRITE_PER_MIN'),
      DEFAULT_WRITE_PER_MIN,
    );
  }
  return parseLimit(
    Deno.env.get('PUBLIC_API_RATE_LIMIT_READ_PER_MIN'),
    DEFAULT_READ_PER_MIN,
  );
}

export function publicApiRateRouteClass(
  routeKind: PublicApiRoute['kind'],
): PublicApiRateRouteClass | null {
  if (routeKind === 'create_demo_run') {
    return 'write';
  }
  if (routeKind === 'account' || routeKind === 'get_demo_run') {
    return 'read';
  }
  return null;
}

export interface RateLimitConsumeSuccess {
  readonly ok: true;
  readonly remaining: number;
  readonly limit: number;
}

export interface RateLimitConsumeFailure {
  readonly ok: false;
  readonly retryAfterSeconds: number;
  readonly limit: number;
}

export type RateLimitConsumeResult =
  | RateLimitConsumeSuccess
  | RateLimitConsumeFailure;

function mapConsumeRpc(data: unknown): RateLimitConsumeResult | null {
  if (data === null || typeof data !== 'object') {
    return null;
  }
  const row = data as Record<string, unknown>;
  if (row['ok'] === true) {
    const limit = typeof row['limit'] === 'number' ? row['limit'] : 0;
    const remaining = typeof row['remaining'] === 'number' ? row['remaining'] : 0;
    return { ok: true, limit, remaining };
  }
  if (row['ok'] === false && row['reason'] === 'rate_limit_exceeded') {
    const retryAfterSeconds =
      typeof row['retry_after_seconds'] === 'number'
        ? row['retry_after_seconds']
        : 60;
    const limit = typeof row['limit'] === 'number' ? row['limit'] : 0;
    return { ok: false, retryAfterSeconds, limit };
  }
  return null;
}

export async function consumePublicApiRateLimit(
  service: SupabaseClient,
  apiKeyId: string,
  routeClass: PublicApiRateRouteClass,
): Promise<RateLimitConsumeResult> {
  const limit = publicApiRateLimitForClass(routeClass);
  const { data, error } = await service.rpc('consume_public_api_rate_limit', {
    p_api_key_id: apiKeyId,
    p_route_class: routeClass,
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  const mapped = mapConsumeRpc(data);
  if (mapped) {
    return mapped;
  }

  return { ok: true, limit, remaining: limit };
}

/** Returns a 429 response when limited; null when allowed. */
export async function enforcePublicApiRateLimit(
  req: Request,
  service: SupabaseClient,
  apiKeyId: string,
  routeClass: PublicApiRateRouteClass,
  requestId: string,
): Promise<Response | null> {
  if (isPublicApiRateLimitDisabled()) {
    return null;
  }

  const result = await consumePublicApiRateLimit(service, apiKeyId, routeClass);
  if (result.ok) {
    return null;
  }

  publicApiLog('public_api_rate_limited', {
    requestId,
    apiKeyId,
    routeClass,
    limit: result.limit,
    retryAfterSeconds: result.retryAfterSeconds,
  });

  return publicApiErrorResponseWithHeaders(
    req,
    429,
    'RATE_LIMIT_EXCEEDED',
    `Rate limit exceeded (${result.limit} requests per minute for ${routeClass}).`,
    requestId,
    {
      'Retry-After': String(result.retryAfterSeconds),
      'X-RateLimit-Limit': String(result.limit),
    },
  );
}
