# Production deploy runbook

Checklist for shipping `apps/web` against a **hosted Supabase** project (e.g. Vercel + Supabase Cloud).

Local pre-release (`npm run pre-release:web`) validates the app against a **local** stack. Use `npm run production:check` before or after pointing production env vars at your hosted project.

---

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. Link CLI and push schema:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

3. Apply seed data if you want the default `demo` org:

   ```bash
   supabase db execute --file supabase/seed.sql
   ```

   Or create your first workspace via sign-up in the app.

4. Note **Project URL** and **anon (publishable) key** from Dashboard → Settings → API.

---

## 2. Edge Functions (billing)

Deploy billing functions and set secrets (Stripe test or live keys):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... STRIPE_PRICE_TEAM=price_...
supabase functions deploy billing-create-checkout
supabase functions deploy billing-create-portal
supabase functions deploy billing-cancel-subscription
supabase functions deploy billing-update-subscription
supabase functions deploy billing-list-invoices
supabase functions deploy stripe-webhook
```

Register the Stripe webhook endpoint:

`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`

See [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) for event types and local smoke.

### Public API (`public-v1`)

Deploy the OSS public API Edge Function (API-key auth; `verify_jwt = false` in `config.toml`):

```bash
supabase functions deploy public-v1
```

Smoke after deploy (with a workspace API key):

```bash
npm run test:demo-runs-http
```

See [PUBLIC_API.md](./PUBLIC_API.md) for routes and base URL.

---

## 3. Auth redirect URLs

In Supabase Dashboard → **Authentication** → **URL configuration**:

| Setting | Example |
|---------|---------|
| Site URL | `https://your-app.vercel.app` |
| Redirect URLs | `https://your-app.vercel.app/**` |

Include auth callback paths your app uses: `/auth/callback`, `/auth/reset-password`, `/auth/confirm-email`.

---

## 4. Frontend (Vercel or static host)

1. Build `apps/web` with production Supabase settings (`apps/web/src/app/supabase.settings.ts` or env injection your fork uses).
2. Set env vars on the host (names may vary by fork; base starter uses settings file):

   | Variable | Purpose |
   |----------|---------|
   | `SUPABASE_URL` | Hosted project URL |
   | `SUPABASE_ANON_KEY` | Publishable anon key |

3. Deploy. SPA hosts need a fallback to `index.html` for client routes.

### API Developer Console (`apps/api-console`)

Separate Vercel project (or static host) using [`vercel.api-console.json`](../vercel.api-console.json):

```bash
npm run build:api-console:vercel
```

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Hosted project URL |
| `SUPABASE_ANON_KEY` | Publishable anon key |

Auth redirect URLs must include the console origin (e.g. `https://api-console.your-domain.com/**`).

Merge gate locally: `npm run pre-release:api-console`. CI: job `api-console-e2e` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## 5. Pre-flight: `production:check`

Copy `.env.example` → `.env` (or export vars in CI) with **hosted** values:

```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
APP_URL=https://your-app.vercel.app   # optional — prints redirect checklist
SEED_ORG_SLUG=demo                    # optional — default demo
SEED_ADMIN_EMAIL=you@example.com      # optional — login smoke
SEED_ADMIN_PASSWORD=...               # optional — login smoke
```

Run:

```bash
npm run production:check
```

### What it checks

| Check | Fails when |
|-------|------------|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Missing |
| Auth health | Project unreachable |
| Anon key | Rejected by REST (401/403) |
| Project ref | Hosted URL ref ≠ JWT `ref` claim |
| Schema tables | Migrations not applied (`organizations`, `organization_activation`, `organization_billing`) |
| Edge Functions | HTTP 404 (not deployed) |
| Seed org | Warns if slug missing (non-fatal) |
| Seed admin login | Fails when email/password set but login fails |
| Auth redirects | Warns with manual checklist when `APP_URL` set |

Manifest (required functions / tables): [`scripts/production-check.manifest.json`](../scripts/production-check.manifest.json).

Exit code `0` = no failures (warnings are OK). Exit code `1` = fix errors before launch.

---

## 6. Post-deploy smoke

1. Open `APP_URL` — sign in or register.
2. Create or switch workspace; open Settings → Billing (mock or Stripe per your config).
3. If Stripe: run a test Checkout from Billing; confirm webhook in Stripe Dashboard.
4. Optional: `npm run e2e:web:release` against a **staging** URL (requires Playwright + test user setup).

---

## Related docs

| Doc | Use when |
|-----|----------|
| [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) | Stripe keys, webhook events, CI smoke |
| [BILLING_CUSTOM_PROVIDER.md](./BILLING_CUSTOM_PROVIDER.md) | Non-Stripe billing |
| [PUBLIC_API.md](./PUBLIC_API.md) | Public API routes, keys, local smoke |
| [apps/api-console/README.md](../apps/api-console/README.md) | API Developer Console dev + E2E |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login redirects to localhost | Site URL / redirect URLs still point at local dev |
| Billing buttons 404 | Edge Functions not deployed to this project |
| `organizations` table missing | `supabase db push` not run on hosted DB |
| Anon key / ref mismatch | `.env` points at project A, key from project B |
| Empty app after deploy | Auth required — not a broken deploy; open `/auth/login` |
