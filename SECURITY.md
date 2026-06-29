# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| latest `main` | Yes |
| older tags | Best-effort only |

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, email **security@oequ.dev** with:

1. Description of the vulnerability.
2. Steps to reproduce or a proof of concept.
3. Impact assessment (what an attacker could do).

We will acknowledge receipt within **48 hours** and aim to provide a fix or mitigation within **7 days** for critical issues.

## Security design

This repository is a **starter kit** — security posture depends on how you deploy it.

| Area | Starter default | Production recommendation |
|------|-----------------|---------------------------|
| Auth tokens | Supabase `localStorage` JWT | HttpOnly cookies or BFF pattern |
| CSP | `<meta>` tag, `unsafe-inline` | Strict CSP via HTTP headers + nonces |
| CSRF | Not configured | `withXsrfConfiguration` for cookie-based APIs |
| Authorization | Supabase RLS | RLS + server-side validation |
| Route guards | UX-only navigation | Backend enforces all access control |

## Disclosure policy

We follow coordinated disclosure. Reporters will be credited in the changelog unless they prefer anonymity.
