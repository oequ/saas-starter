# API Console (`apps/api-console`)

OSS developer console for the public REST API (`public-v1`). Port **4202**.

## Local dev

1. Start Supabase: `npm run db:start` (from repo root)
2. Copy settings: `node scripts/write-web-supabase-settings.mjs` (or copy `supabase.settings.example.ts` → `supabase.settings.ts`)
3. Serve Edge (if needed): `npm run functions:serve`
4. Run console: `npm run start:api-console`
5. Open http://localhost:4202 — register → overview → API keys → playground

## Routes (OSS)

| Path | Page |
|------|------|
| `/overview` | Usage units, project id, get-started checklist |
| `/keys` | Workspace API keys (`@oequ/features-org`) |
| `/playground` | OSS Public API presets (`/account`, `/demo-runs`) |
| `/metered-usage` | API usage events table |
| `/docs` | curl / TS / Python snippets |
| `/account` | Profile + project id |

## E2E / merge gate

```bash
npm run e2e:api-console:preflight   # Supabase + Mailpit + Edge
npm run verify:api-console            # preflight + Playwright @api-console
npm run pre-release:api-console       # full gate (db reset, build, e2e, smoke)
```

Requires local Supabase (Docker), Mailpit on `:54324` for signup OTP, and Edge `public-v1`.
CI: GitHub Actions job `api-console-e2e` runs the same `@api-console` Playwright suite on PRs.
On Windows if Edge in Docker fails DNS: `npm run functions:serve` in another terminal.

## Deploy (Vercel)

Use `vercel.api-console.json` as the project config. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel env.

See [docs/PUBLIC_API.md](../../docs/PUBLIC_API.md) for the backend contract.
