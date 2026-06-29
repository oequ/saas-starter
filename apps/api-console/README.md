# API Console (`apps/api-console`)

OSS developer console for the public REST API (`public-v1`). Port **4202**.

## Local dev

1. Start Supabase: `npm run db:start` (from repo root)
2. Copy settings: `node scripts/write-web-supabase-settings.mjs` (or copy `supabase.settings.example.ts` → `supabase.settings.ts`)
3. Serve Edge (if needed): `npm run functions:serve`
4. Run console: `npm run start:api-console`
5. Open http://localhost:4202 — register → overview → API keys → docs

## Routes (OSS PR2)

| Path | Page |
|------|------|
| `/overview` | Usage units, project id, get-started checklist |
| `/keys` | Workspace API keys (`@oequ/features-org`) |
| `/settings` | Theme + locale |
| `/docs` | curl / TS / Python snippets for `/account` and `/demo-runs` |
| `/account` | Profile + project id |

Playground and metered-usage UI ship in PR3.

## Deploy (Vercel)

Use `vercel.api-console.json` as the project config. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel env.

See [docs/PUBLIC_API.md](../../docs/PUBLIC_API.md) for the backend contract.
