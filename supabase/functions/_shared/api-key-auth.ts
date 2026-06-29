import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

import {
  newPublicApiRequestId,
  publicApiErrorResponse,
} from './public-api-errors.ts';
import { createServiceClient } from './supabase-clients.ts';

const API_KEY_PREFIX = 'oeq_';

export type ApiKeyPermission = 'full_access' | 'sending_access';

export interface ApiKeyAuthContext {
  readonly requestId: string;
  readonly keyId: string;
  readonly organizationId: string;
  readonly permission: ApiKeyPermission;
  readonly canWrite: boolean;
  readonly canRead: boolean;
  readonly projectId: string;
  readonly projectSlug: string;
}

export interface ApiKeyVerifySuccess {
  readonly ok: true;
  readonly keyId: string;
  readonly organizationId: string;
  readonly permission: ApiKeyPermission;
  readonly canWrite: boolean;
  readonly canRead: boolean;
}

export interface ApiKeyVerifyFailure {
  readonly ok: false;
  readonly reason: string;
}

export type ApiKeyVerifyResult = ApiKeyVerifySuccess | ApiKeyVerifyFailure;

export type ParseBearerApiKeyResult =
  | { readonly ok: true; readonly secret: string }
  | { readonly ok: false; readonly reason: string };

/** Extract Bearer token from Authorization header (no validation). */
export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/** Parse and validate oeq_* secret shape from the request. */
export function parseBearerApiKey(req: Request): ParseBearerApiKeyResult {
  const token = extractBearerToken(req.headers.get('Authorization'));
  if (!token) {
    return { ok: false, reason: 'missing_bearer' };
  }
  if (!token.startsWith(API_KEY_PREFIX)) {
    return { ok: false, reason: 'invalid_prefix' };
  }
  if (token.length < 16) {
    return { ok: false, reason: 'invalid_secret' };
  }
  return { ok: true, secret: token };
}

/** Map verify_organization_api_key RPC JSON to a typed result. */
export function mapVerifyRpcPayload(data: unknown): ApiKeyVerifyResult {
  if (data === null || typeof data !== 'object') {
    return { ok: false, reason: 'invalid_response' };
  }
  const row = data as Record<string, unknown>;
  if (row['ok'] !== true) {
    const reason = typeof row['reason'] === 'string' ? row['reason'] : 'not_found';
    return { ok: false, reason };
  }
  const keyId = row['key_id'];
  const organizationId = row['organization_id'];
  const permission = row['permission'];
  if (typeof keyId !== 'string' || typeof organizationId !== 'string') {
    return { ok: false, reason: 'invalid_response' };
  }
  if (permission !== 'full_access' && permission !== 'sending_access') {
    return { ok: false, reason: 'invalid_response' };
  }
  return {
    ok: true,
    keyId,
    organizationId,
    permission,
    canWrite: row['can_write'] === true,
    canRead: row['can_read'] === true,
  };
}

export async function verifyOrganizationApiKey(
  service: SupabaseClient,
  secret: string,
): Promise<ApiKeyVerifyResult> {
  const { data, error } = await service.rpc('verify_organization_api_key', {
    p_secret: secret,
  });
  if (error) {
    return { ok: false, reason: 'rpc_error' };
  }
  return mapVerifyRpcPayload(data);
}

export interface EnsureApiProjectSuccess {
  readonly ok: true;
  readonly projectId: string;
  readonly projectSlug: string;
  readonly created: boolean;
}

export interface EnsureApiProjectFailure {
  readonly ok: false;
  readonly reason: string;
}

export type EnsureApiProjectResult = EnsureApiProjectSuccess | EnsureApiProjectFailure;

export function mapEnsureApiProjectPayload(data: unknown): EnsureApiProjectResult {
  if (data === null || typeof data !== 'object') {
    return { ok: false, reason: 'invalid_response' };
  }
  const row = data as Record<string, unknown>;
  if (row['ok'] !== true) {
    const reason = typeof row['reason'] === 'string' ? row['reason'] : 'failed';
    return { ok: false, reason };
  }
  const project = row['project'];
  if (project === null || typeof project !== 'object') {
    return { ok: false, reason: 'invalid_response' };
  }
  const p = project as Record<string, unknown>;
  const id = p['id'];
  const slug = p['slug'];
  if (typeof id !== 'string' || typeof slug !== 'string') {
    return { ok: false, reason: 'invalid_response' };
  }
  return {
    ok: true,
    projectId: id,
    projectSlug: slug,
    created: row['created'] === true,
  };
}

export async function ensureApiProject(
  service: SupabaseClient,
  organizationId: string,
): Promise<EnsureApiProjectResult> {
  const { data, error } = await service.rpc('ensure_api_project', {
    p_organization_id: organizationId,
  });
  if (error) {
    return { ok: false, reason: 'rpc_error' };
  }
  return mapEnsureApiProjectPayload(data);
}

export interface AuthenticateApiKeyOptions {
  readonly requireWrite?: boolean;
}

/**
 * Validates Bearer workspace API key and resolves default api-default project.
 * Returns Response on auth failure (401/403/500) for direct return from handlers.
 */
export async function authenticateApiKeyRequest(
  req: Request,
  options: AuthenticateApiKeyOptions = {},
): Promise<ApiKeyAuthContext | Response> {
  const requestId = newPublicApiRequestId();
  const parsed = parseBearerApiKey(req);
  if (!parsed.ok) {
    return publicApiErrorResponse(
      req,
      401,
      'INVALID_API_KEY',
      'Invalid or missing API key. Use Authorization: Bearer oeq_…',
      requestId,
    );
  }

  const service = createServiceClient();
  const verified = await verifyOrganizationApiKey(service, parsed.secret);
  if (!verified.ok) {
    return publicApiErrorResponse(
      req,
      401,
      'INVALID_API_KEY',
      'Invalid or revoked API key.',
      requestId,
    );
  }

  if (options.requireWrite && !verified.canWrite) {
    return publicApiErrorResponse(
      req,
      403,
      'INSUFFICIENT_SCOPE',
      'This API key does not have write access.',
      requestId,
    );
  }

  const project = await ensureApiProject(service, verified.organizationId);
  if (!project.ok) {
    return publicApiErrorResponse(
      req,
      500,
      'API_PROJECT_UNAVAILABLE',
      'Could not resolve API workspace for this organization.',
      requestId,
    );
  }

  return {
    requestId,
    keyId: verified.keyId,
    organizationId: verified.organizationId,
    permission: verified.permission,
    canWrite: verified.canWrite,
    canRead: verified.canRead,
    projectId: project.projectId,
    projectSlug: project.projectSlug,
  };
}
