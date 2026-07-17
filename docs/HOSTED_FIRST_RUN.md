# Hosted first run

Sequential checklist for the **first** hosted Supabase + frontend deploy.
Do the steps in order. Prefer a green local gate before cloud.

This starter is a **showcase of code and process**: small, reviewable changes;
local truth first; hosted only when the checklist is intentional.

For the full production runbook (billing secrets, Stripe, deeper smoke), see
[DEPLOY.md](./DEPLOY.md). For local Docker Auth/Mailpit, see [supabase/README.md](../supabase/README.md).

---

## What you are deploying

| Surface | Backend | Typical host |
|---------|---------|--------------|
| `apps/demo` | Mock only (no Supabase) | GitHub Pages or root Vercel project |
| `apps/web` | Hosted Supabase | Separate Vercel project (or static host) |
| `apps/api-console` | Hosted Supabase | Second Vercel project, Root Directory `apps/api-console` |

Mock demo does **not** need this checklist. Use it when you want a real Auth +
DB backend for `web` and/or `api-console`.

---

## Prerequisites

- [ ] Local stack healthy: `npm run db:start` and (when you care about web/console) `npm run pre-release:web` or `npm run pre-release:api-console`
- [ ] Supabase CLI available via the repo (`npx supabase …`)
- [ ] A **new or empty** hosted Supabase project (Dashboard → New project)
- [ ] Optional at create time: enable automatic RLS on new `public` tables
- [ ] Skip “Connect GitHub” for the first run unless you already know you want schema auto-deploy

---

## Checklist (in order)

### 1. Create the hosted project

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Save the database password somewhere safe (needed for `supabase link` / DB URL).
3. Wait until the project is **Active**.

### 2. Copy API credentials

Dashboard → **Project Settings → API**:

| Setting | Env / settings field |
|---------|----------------------|
| Project URL | `SUPABASE_URL` → `https://<project-ref>.supabase.co` |
| Publishable (or legacy anon) key | `SUPABASE_ANON_KEY` |

Do **not** commit these values. Use `.env` (gitignored) and/or host env vars.
App files `apps/*/src/app/supabase.settings.ts` are gitignored; generate them with:

```bash
export SUPABASE_URL=https://<project-ref>.supabase.co
export SUPABASE_ANON_KEY=<publishable-or-anon-key>
node scripts/write-web-supabase-settings.mjs
```

### 3. Configure Auth URLs (before first browser login)

Dashboard → **Authentication → URL configuration**.

Pick the origin you will open first (examples):

| App | Site URL example | Redirect allowlist |
|-----|------------------|--------------------|
| Web | `https://your-web.vercel.app` | `https://your-web.vercel.app/**` |
| API Console | `https://saas-starter-api-console.vercel.app` | `https://saas-starter-api-console.vercel.app/**` |

Include paths the apps use: `/auth/callback`, `/auth/reset-password`, `/auth/confirm-email`.
You can list **both** web and console origins in Redirect URLs.

Hosted email confirmation is usually **on**. Keep `requireEmailConfirmation: true`
in generated settings (the writer script already sets this).

### 4. Link CLI and push schema

From the repo root (you will be prompted for the DB password unless already linked):

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Optional seed (demo org fixtures):

```bash
npx supabase db execute --file supabase/seed.sql
```

Or skip seed and create the first workspace via sign-up in the app.

### 5. Deploy Edge Functions you need

**Minimum for Public API + API Console playground**

```bash
npx supabase functions deploy public-v1
```

**If you use Stripe billing on `apps/web`**, also set secrets and deploy the
billing functions listed in [DEPLOY.md §2](./DEPLOY.md#2-edge-functions-billing).
At minimum in production:

```bash
npx supabase secrets set ALLOWED_REDIRECT_ORIGINS=https://your-web.vercel.app
```

(Fail-closed: without this, Checkout/Portal `return_url` only allows localhost.)

### 6. Point the frontend host at hosted Supabase

**API Console (second Vercel project)**

1. Import the same GitHub repo again.
2. Project name e.g. `saas-starter-api-console`.
3. Root Directory: `apps/api-console` (uses [`apps/api-console/vercel.json`](../apps/api-console/vercel.json)).
4. Env (Production + Preview): `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
5. Deploy.

**Web app**

Same pattern with Root Directory / build for `apps/web`, or inject settings via
your fork’s env story. See [DEPLOY.md §4](./DEPLOY.md#4-frontend-vercel-or-static-host).

**Mock demo** stays on GitHub Pages / root `vercel.json` — no Supabase env required.

### 7. Pre-flight against hosted

```bash
# .env with hosted SUPABASE_URL + SUPABASE_ANON_KEY (and optional APP_URL)
npm run production:check
```

Exit `0` means no hard failures. Fix table/Edge 404s before calling the stack “live”.

### 8. Manual smoke (quality gate)

Do these by hand once; do not skip because CI was green locally.

1. Open the hosted app → **Register** (or sign in).
2. Complete email confirmation if prompted.
3. Create or enter a workspace.
4. **API Console:** create an API key → call a playground preset (needs `public-v1`).
5. **Web (optional):** Settings → Billing loads; Members invite UI loads.

If login bounces to localhost, Auth URL config is wrong (step 3).
If REST/RPC fails with missing relation, `db push` did not apply (step 4).

---

## Suggested stop points

Ship process in small PRs / sessions:

1. Steps 1–3 (project + credentials + Auth URLs) — no code change.
2. Steps 4–5 (schema + functions) — verify with `production:check`.
3. Step 6 (frontend host) — one surface at a time (console **or** web).
4. Step 8 smoke — only then call the hosted path “done”.

---

## Related

| Doc | When |
|-----|------|
| [DEPLOY.md](./DEPLOY.md) | Full production runbook |
| [PUBLIC_API.md](./PUBLIC_API.md) | Public API contract + local smoke |
| [apps/api-console/README.md](../apps/api-console/README.md) | Console routes and Vercel notes |
| [supabase/README.md](../supabase/README.md) | Local Docker, confirmations, Mailpit |
