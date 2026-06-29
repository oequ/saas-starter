import { jsonResponse } from './cors.ts';

export interface PublicApiErrorBody {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
}

export function newPublicApiRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function publicApiErrorResponse(
  req: Request,
  status: number,
  code: string,
  message: string,
  requestId: string,
): Response {
  return publicApiErrorResponseWithHeaders(
    req,
    status,
    code,
    message,
    requestId,
    {},
  );
}

export function publicApiErrorResponseWithHeaders(
  req: Request,
  status: number,
  code: string,
  message: string,
  requestId: string,
  extraHeaders: Record<string, string>,
): Response {
  const body: PublicApiErrorBody = {
    error: { code, message },
    request_id: requestId,
  };
  const base = jsonResponse(body, status, req);
  const headers = new Headers(base.headers);
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }
  return new Response(base.body, { status: base.status, headers });
}
