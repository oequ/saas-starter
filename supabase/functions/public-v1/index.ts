import {
  authenticateApiKeyRequest,
  type ApiKeyAuthContext,
} from '../_shared/api-key-auth.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { errorMessage } from '../_shared/error-message.ts';
import {
  newPublicApiRequestId,
  publicApiErrorResponse,
} from '../_shared/public-api-errors.ts';
import { publicApiLog } from '../_shared/public-api-log.ts';
import {
  enforcePublicApiRateLimit,
  publicApiRateRouteClass,
} from '../_shared/public-api-rate-limit.ts';
import { resolvePublicApiRoute } from '../_shared/public-api-router.ts';
import { createServiceClient } from '../_shared/supabase-clients.ts';

const DEMO_RUN_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CreateDemoRunBody {
  message?: string;
}

function publicSuccess(
  req: Request,
  data: Record<string, unknown>,
  status: number,
  requestId: string,
): Response {
  return jsonResponse({ ...data, request_id: requestId }, status, req);
}

async function handleAccount(req: Request, ctx: ApiKeyAuthContext): Promise<Response> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('usage_unit_balances')
    .select('available, monthly_allowance, reset_at')
    .eq('org_id', ctx.organizationId)
    .maybeSingle();

  if (error) {
    return publicApiErrorResponse(
      req,
      500,
      'ACCOUNT_UNAVAILABLE',
      'Could not load account balance.',
      ctx.requestId,
    );
  }

  return publicSuccess(
    req,
    {
      usage_units: {
        balance: data?.available ?? 0,
        monthly_allowance: data?.monthly_allowance ?? 0,
        reset_at: data?.reset_at ?? null,
        currency: 'usage_units',
      },
    },
    200,
    ctx.requestId,
  );
}

async function handleCreateDemoRun(
  req: Request,
  ctx: ApiKeyAuthContext,
): Promise<Response> {
  let body: CreateDemoRunBody = {};
  try {
    const raw = await req.text();
    if (raw.trim().length > 0) {
      body = JSON.parse(raw) as CreateDemoRunBody;
    }
  } catch {
    return publicApiErrorResponse(
      req,
      400,
      'INVALID_JSON',
      'Request body must be JSON.',
      ctx.requestId,
    );
  }

  const service = createServiceClient();
  const started = performance.now();

  const { data, error } = await service.rpc('submit_public_demo_run', {
    p_org_id: ctx.organizationId,
    p_api_key_id: ctx.keyId,
    p_input: { message: body.message ?? 'hello from playground' },
    p_units: 1,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('insufficient usage units')) {
      return publicApiErrorResponse(
        req,
        402,
        'INSUFFICIENT_USAGE_UNITS',
        'Not enough usage units.',
        ctx.requestId,
      );
    }
    publicApiLog('public_api_demo_run_error', {
      requestId: ctx.requestId,
      error: error.message,
    });
    return publicApiErrorResponse(
      req,
      500,
      'DEMO_RUN_FAILED',
      'Could not create demo run.',
      ctx.requestId,
    );
  }

  const row = data as Record<string, unknown> | null;
  const latencyMs = Math.round(performance.now() - started);
  const runId = typeof row?.['id'] === 'string' ? row['id'] : null;

  if (runId) {
    await service
      .from('usage_events')
      .update({ latency_ms: latencyMs })
      .eq('run_id', runId);
  }

  return publicSuccess(
    req,
    {
      id: row?.['id'],
      status: row?.['status'] ?? 'completed',
      output: row?.['output'] ?? null,
      units_charged: row?.['units_charged'] ?? 1,
    },
    200,
    ctx.requestId,
  );
}

async function handleGetDemoRun(
  req: Request,
  ctx: ApiKeyAuthContext,
  runId: string,
): Promise<Response> {
  if (!DEMO_RUN_ID_RE.test(runId)) {
    return publicApiErrorResponse(
      req,
      404,
      'NOT_FOUND',
      'Demo run not found.',
      ctx.requestId,
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('demo_runs')
    .select('id, status, input, output, units_charged, created_at, completed_at')
    .eq('id', runId)
    .eq('org_id', ctx.organizationId)
    .maybeSingle();

  if (error) {
    return publicApiErrorResponse(
      req,
      500,
      'DEMO_RUN_UNAVAILABLE',
      'Could not load demo run.',
      ctx.requestId,
    );
  }

  if (!data) {
    return publicApiErrorResponse(
      req,
      404,
      'NOT_FOUND',
      'Demo run not found.',
      ctx.requestId,
    );
  }

  return publicSuccess(
    req,
    {
      run: {
        id: data.id,
        status: data.status,
        input: data.input,
        output: data.output,
        units_charged: data.units_charged,
        created_at: data.created_at,
        completed_at: data.completed_at,
      },
    },
    200,
    ctx.requestId,
  );
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const route = resolvePublicApiRoute(req);

  if (route.kind === 'not_found') {
    const requestId = newPublicApiRequestId();
    return publicApiErrorResponse(
      req,
      404,
      'NOT_FOUND',
      'Unknown API route.',
      requestId,
    );
  }

  if (route.kind === 'method_not_allowed') {
    const requestId = newPublicApiRequestId();
    return publicApiErrorResponse(
      req,
      405,
      'METHOD_NOT_ALLOWED',
      `Use ${route.allowed} for this endpoint.`,
      requestId,
    );
  }

  const needsWrite = route.kind === 'create_demo_run';
  const auth = await authenticateApiKeyRequest(req, {
    requireWrite: needsWrite,
  });
  if (auth instanceof Response) {
    return auth;
  }

  if (!auth.canRead && route.kind !== 'create_demo_run') {
    return publicApiErrorResponse(
      req,
      403,
      'INSUFFICIENT_SCOPE',
      'This API key cannot read account data.',
      auth.requestId,
    );
  }

  const rateClass = publicApiRateRouteClass(route.kind);
  if (rateClass) {
    const service = createServiceClient();
    try {
      const limited = await enforcePublicApiRateLimit(
        req,
        service,
        auth.keyId,
        rateClass,
        auth.requestId,
      );
      if (limited) {
        return limited;
      }
    } catch (rateErr) {
      publicApiLog('public_api_rate_limit_error', {
        requestId: auth.requestId,
        error: errorMessage(rateErr),
      });
      return publicApiErrorResponse(
        req,
        500,
        'RATE_LIMIT_UNAVAILABLE',
        'Could not evaluate rate limit.',
        auth.requestId,
      );
    }
  }

  try {
    switch (route.kind) {
      case 'account':
        return await handleAccount(req, auth);
      case 'create_demo_run':
        return await handleCreateDemoRun(req, auth);
      case 'get_demo_run':
        return await handleGetDemoRun(req, auth, route.id);
      default:
        return publicApiErrorResponse(
          req,
          404,
          'NOT_FOUND',
          'Unknown API route.',
          auth.requestId,
        );
    }
  } catch (err) {
    publicApiLog('public_api_unhandled', {
      requestId: auth.requestId,
      error: errorMessage(err),
    });
    return publicApiErrorResponse(
      req,
      500,
      'INTERNAL_ERROR',
      'Unexpected error.',
      auth.requestId,
    );
  }
});
