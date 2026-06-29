export type PublicApiRoute =
  | { readonly kind: 'account'; readonly method: 'GET' }
  | { readonly kind: 'create_demo_run'; readonly method: 'POST' }
  | { readonly kind: 'get_demo_run'; readonly method: 'GET'; readonly id: string }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'method_not_allowed'; readonly allowed: string };

function normalizePathSuffix(rest: string): string {
  if (rest === '' || rest === '/') {
    return '/';
  }
  return rest.endsWith('/') && rest.length > 1 ? rest.slice(0, -1) : rest;
}

/** Path after the Edge function name (e.g. `/v1/account`). */
export function publicApiPathAfterFunction(
  pathname: string,
  functionName = 'public-v1',
): string {
  const needles = [`/functions/v1/${functionName}`, `/${functionName}`];
  for (const needle of needles) {
    const idx = pathname.indexOf(needle);
    if (idx !== -1) {
      return normalizePathSuffix(pathname.slice(idx + needle.length));
    }
  }
  if (pathname.startsWith('/v1')) {
    return normalizePathSuffix(pathname);
  }
  return pathname;
}

export function matchPublicApiRoute(
  method: string,
  pathAfterFunction: string,
): PublicApiRoute {
  const path = pathAfterFunction.split('?')[0] ?? pathAfterFunction;

  if (path === '/v1/account') {
    return method === 'GET'
      ? { kind: 'account', method: 'GET' }
      : { kind: 'method_not_allowed', allowed: 'GET' };
  }

  if (path === '/v1/demo-runs') {
    return method === 'POST'
      ? { kind: 'create_demo_run', method: 'POST' }
      : { kind: 'method_not_allowed', allowed: 'POST' };
  }

  const demoRunMatch = path.match(/^\/v1\/demo-runs\/([^/]+)$/);
  if (demoRunMatch) {
    const id = demoRunMatch[1]?.trim() ?? '';
    if (!id) {
      return { kind: 'not_found' };
    }
    return method === 'GET'
      ? { kind: 'get_demo_run', method: 'GET', id }
      : { kind: 'method_not_allowed', allowed: 'GET' };
  }

  return { kind: 'not_found' };
}

export function resolvePublicApiRoute(req: Request): PublicApiRoute {
  const url = new URL(req.url);
  const pathAfterFunction = publicApiPathAfterFunction(url.pathname);
  return matchPublicApiRoute(req.method, pathAfterFunction);
}
