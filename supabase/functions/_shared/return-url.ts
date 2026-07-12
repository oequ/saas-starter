/**
 * Validate billing return_url / success URLs passed to Stripe Checkout & Portal.
 * Fail closed: non-local origins require ALLOWED_REDIRECT_ORIGINS.
 */
export function isAllowedReturnUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }

  // Reject credentials / unexpected ports tricks on userinfo
  if (parsed.username || parsed.password) {
    return false;
  }

  const origin = parsed.origin.toLowerCase();
  const allowedCsv = Deno.env.get('ALLOWED_REDIRECT_ORIGINS')?.trim();

  if (allowedCsv) {
    const origins = allowedCsv
      .split(',')
      .map((o) => o.trim().toLowerCase())
      .filter(Boolean);
    return origins.includes(origin);
  }

  // Local / CI default when the secret is unset: loopback only.
  // Do NOT allow arbitrary https — that was an open-redirect bypass.
  const host = parsed.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}
