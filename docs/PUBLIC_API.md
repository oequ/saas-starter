# Public API (OSS)

Workspace-scoped REST API for integrators. Ships with **usage units** metering and a sandbox `demo-runs` endpoint.

See [ADR 0004](./adr/0004-public-api-usage-units.md) for architecture. OpenAPI: [`openapi/public-v1.yaml`](../openapi/public-v1.yaml).

## Local quick start

```bash
npm run db:start
npm run db:reset
npm run functions:serve    # separate terminal; uses supabase/.env
npm run test:demo-runs-http
```

Expected: `demo-runs-http-smoke: OK` (creates key → POST demo-runs → balance −1).

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local | `http://127.0.0.1:54321/functions/v1/public-v1/v1` |
| Production | `https://<project-ref>.supabase.co/functions/v1/public-v1/v1` |

Send Supabase `apikey` header (anon/publishable) **and** `Authorization: Bearer oeq_<your-key>`.

## Endpoints (OSS)

| Method | Path | Cost |
|--------|------|------|
| `GET` | `/account` | — |
| `POST` | `/demo-runs` | 1 usage unit |
| `GET` | `/demo-runs/{id}` | — |

## Create a key

1. Run `apps/web`, sign in, open **Settings → API keys** (or use Studio SQL for smoke).
2. Create key with **full access** (required for `POST /demo-runs`).
3. Copy the `oeq_…` secret once — only a hash is stored server-side.

## Example

```bash
curl -s "http://127.0.0.1:54321/functions/v1/public-v1/v1/account" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer oeq_your_key"
```

## Deploy Edge Function

```bash
supabase functions deploy public-v1
```

`config.toml` sets `verify_jwt = false` — auth is API-key-only.

## Related

- [DEPLOY.md](./DEPLOY.md) — hosted Supabase + Vercel
- [supabase/README.md](../supabase/README.md) — local Docker stack
