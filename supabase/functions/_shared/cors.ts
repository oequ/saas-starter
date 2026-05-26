const ALLOWED_ORIGINS_CSV = Deno.env.get('ALLOWED_ORIGINS') ?? '';

const allowedOrigins: Set<string> = new Set(
  ALLOWED_ORIGINS_CSV
    ? ALLOWED_ORIGINS_CSV.split(',').map((o) => o.trim().toLowerCase())
    : [],
);

function resolveOrigin(req: Request): string {
  const origin = req.headers.get('Origin')?.toLowerCase() ?? '';

  if (allowedOrigins.size === 0) {
    return origin || '*';
  }

  if (allowedOrigins.has(origin)) {
    return origin;
  }

  if (
    origin.startsWith('http://localhost:') ||
    origin === 'http://localhost'
  ) {
    return origin;
  }

  return '';
}

export function corsHeadersForRequest(req: Request): Record<string, string> {
  const origin = resolveOrigin(req);
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    ...(origin !== '*' ? { Vary: 'Origin' } : {}),
  };
}

/** @deprecated Use corsHeadersForRequest(req) for origin-aware headers. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(
  body: unknown,
  status = 200,
  req?: Request,
): Response {
  const headers = req
    ? { ...corsHeadersForRequest(req), 'Content-Type': 'application/json' }
    : { ...corsHeaders, 'Content-Type': 'application/json' };
  return new Response(JSON.stringify(body), { status, headers });
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersForRequest(req) });
  }
  return null;
}
