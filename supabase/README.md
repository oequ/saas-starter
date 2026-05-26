# Supabase (local database)

Migrations implement **default-deny** on `public`, then explicit grants + RLS per table.

Official flow: [Local development with Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) — **Docker** runs the stack, **CLI** manages it.

## Migrations

| File | Purpose |
|------|---------|
| `0000_hardened_baseline.sql` | `REVOKE ALL` on `public` for `anon` / `authenticated`; grant `USAGE` only |
| `0001_init_orgs.sql` | `organizations`, `organization_members`, RLS read policies, `GRANT SELECT` |
| `0002_org_writes_rls.sql` | RPC `create_organization`, `invite_organization_member`, write RLS, invitations, JWT hook |
| `0003_claim_invitations.sql` | `claim_my_invitations()`, auth signup trigger, owner-only org delete |
| `0004_create_org_validate_auth_user.sql` | `create_organization` rejects stale JWT (user missing in `auth.users`) |
| `0005_fix_rls_recursion.sql` | RLS on orgs/members via `private.is_org_member` (fixes `42P17`) |
| `0006_rls_helper_grants.sql` | `GRANT EXECUTE` on private helpers for RLS |
| `0007_org_seat_limits.sql` | `organizations.seats_limit` (default 3); seat count = members + pending invitations; enforced on invite, claim, and `BEFORE INSERT` triggers |
| `0008_org_billing_plan.sql` | `organizations.plan_id`; `get_organization_billing_snapshot`, `update_organization_plan` (syncs `seats_limit` with plan tier) |
| `0009_stripe_billing.sql` | Stripe billing (superseded by `0013` for mirror table) |
| `0013_billing_multi_provider.sql` | `organization_billing`, `billing_events (provider, external_event_id)`, `apply_billing_subscription`; Stripe wrappers kept |
| `0014_organization_invoices.sql` | `organization_invoices`, `list_organization_invoices`, `upsert_organization_invoice` (custom providers) |
| `0015_stripe_per_seat_seats_limit.sql` | `apply_billing_subscription(..., p_seats_limit)` — Team Stripe quantity → `seats_limit` |
| `0010_organization_api_keys.sql` | Hashed API keys; `list` / `create` / `revoke` RPCs (admin writes) |
| `0011_outbound_emails.sql` | Outbound email log, quota helpers, `list_outbound_emails` / `simulate_outbound_emails`; billing snapshot email usage |
| `0012_organization_activation.sql` | `organization_activation` + onboarding RPCs; `create_organization` seeds `pending` |

Edge Functions (Deno 2, see `config.toml`): `billing-create-checkout`, `billing-create-portal`, `billing-cancel-subscription`, `billing-update-subscription`, `billing-list-invoices`, `stripe-webhook`; example `billing-custom-webhook.example` for other providers. Stripe: [docs/STRIPE_LOCAL.md](../docs/STRIPE_LOCAL.md). Custom: [docs/BILLING_CUSTOM_PROVIDER.md](../docs/BILLING_CUSTOM_PROVIDER.md).

There are **no** permissive `WITH CHECK (true)` insert policies on `organizations`. Demo rows are seeded as superuser, not via a hole in RLS.

## Using an existing Supabase in Docker

If you already run the **self-hosted compose** stack (e.g. `C:\cursor\job\supabase\docker` with Kong on **8000** and Postgres on **54322**), reuse it — do **not** run `npm run db:start` in this repo (port **54322** would conflict; CLI expects its own containers named `supabase_db_saas-starter`).

### App `.env` (Angular / `apps/web`)

From the compose project’s `.env` (same keys the stack was bootstrapped with):

```env
SUPABASE_URL=http://127.0.0.1:8000
SUPABASE_ANON_KEY=<ANON_KEY from compose .env>
```

API goes through **Kong** (`8000`), not CLI default `54321`.

### Migrations from this repo

The running DB may already have other `public` tables (e.g. `teams`, `workspaces`). That is fine — our tables are `organizations` / `organization_members`.

- **Do not** `npm run db:reset` on that database unless you intend to wipe the whole Postgres volume.
- Apply only this repo’s SQL once:

  ```bash
  npx supabase migration up --db-url "postgresql://postgres:<POSTGRES_PASSWORD>@127.0.0.1:54322/postgres"
  ```

  Password: `POSTGRES_PASSWORD` in the compose `.env`. Then run `supabase/seed.sql` in Studio SQL if you need the `demo` org.

`npx supabase status` in **saas-starter** will fail until you use CLI-managed containers — that is expected when using an external compose stack.

## Prerequisites

### 1. Docker (required)

The CLI starts Supabase as **Docker containers** (Postgres, Auth, Studio, …).

- **Windows:** [Docker Desktop](https://docs.docker.com/desktop/) with **WSL2** enabled ([Supabase note](https://supabase.com/docs/guides/local-development))
- **macOS / Linux:** Docker Desktop, Rancher Desktop, or Podman (Docker-compatible API)

Verify Docker is running:

```bash
docker ps
```

### 2. Supabase CLI (this repo)

CLI is a **devDependency** — same version for everyone, no global install required.

```bash
npm install
npx supabase --version
```

Optional global install (Windows): [Scoop](https://scoop.sh/) — `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git` then `scoop install supabase`. Not required if you use `npm run db:*` below.

> **Note:** `npm install -g supabase` is [not supported](https://supabase.com/docs/guides/local-development/cli/getting-started). Use devDependency or Scoop/Homebrew.

## Setup

Run from the **repository root** (folder that contains `supabase/`), not from inside `supabase/`.

1. **First time only** — create `config.toml` if missing:

   ```bash
   npm run db:init
   ```

2. Start Docker stack (first run downloads images; may take several minutes):

   ```bash
   npm run db:start
   ```

3. Apply migrations + seed:

   ```bash
   npm run db:reset
   ```

4. Copy credentials into `.env` (from `.env.example`):

   ```bash
   npm run db:status
   ```

   Use **Project URL** → `SUPABASE_URL` and **Publishable** (or legacy anon) key → `SUPABASE_ANON_KEY`.

5. Open Studio (optional): http://127.0.0.1:54323

### Password reset (`apps/web`)

Local Auth is configured for **`http://localhost:4201`** in [`config.toml`](config.toml) (`site_url` + `additional_redirect_urls`). Use the same host in the browser (`localhost`, not `127.0.0.1`) — on Windows the dev server may not answer on `127.0.0.1`. After changing that file, run `npm run db:stop` then `npm run db:start`.

1. In the app: **Forgot password** → enter the email of a registered user.
2. Open **Mailpit** (local mail UI): http://127.0.0.1:54324 — open the recovery message and click the link.
3. You should land on `/auth/reset-password`, set a new password, then sign in.

Recovery emails are not sent to a real inbox in local dev; they only appear in Mailpit.

### npm scripts

| Script | Command |
|--------|---------|
| `npm run db:init` | `supabase init` |
| `npm run db:start` | `supabase start` |
| `npm run db:stop` | `supabase stop` |
| `npm run db:reset` | `supabase db reset` |
| `npm run db:status` | `supabase status` |

## Auth hook (workspace in JWT)

`config.toml` enables `custom_access_token_hook`. The app sets `user_metadata.active_org_slug` when you switch workspace; the hook embeds `app_metadata.org` in the access token.

After changing migrations or `config.toml`, run `npm run db:stop` then `npm run db:start` (or full `db:reset`).

## After first sign-up (optional: link to seeded `demo`)

`seed.sql` creates org slug **`demo`**. New users can also **create a workspace** in the app (`create_organization` RPC) without manual SQL.

To attach to the seeded org instead, in **SQL Editor** (Studio → SQL), run once (replace the UUID):

```sql
insert into public.organization_members (organization_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  '<your-auth-users-uuid>',
  'owner'
)
on conflict do nothing;
```

Find your user id: Studio → **Authentication** → Users → copy UUID.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to Docker` | Start Docker Desktop; wait until `docker ps` works |
| CLI / `npx supabase` errors on Windows | Use `npm run db:*` after `npm install`; or install CLI via Scoop |
| Port already in use | `npm run db:stop`, or change ports in `supabase/config.toml` |
| `supabase_analytics_*` unhealthy / `Analytics on Windows requires Docker daemon exposed on tcp://localhost:2375` | This repo sets `[analytics] enabled = false` in `config.toml` (not needed for auth/org). To use analytics anyway: Docker Desktop → Settings → General → **Expose daemon on tcp://localhost:2375 without TLS**, then set `enabled = true`. |
| Several containers unhealthy after failed start (`pg_meta`, `studio` starting) | `npm run db:stop`, wait 10s, `npm run db:start` again. `db:start` uses `--ignore-health-check` (Auth/Postgres/Mailpit still work). |
| `db:reset` fails right after first `db:start` | Wait ~30s for Postgres, then `npm run db:reset` again |
| `supabase_storage_*` unhealthy | This repo sets `[storage] enabled = false` (not required for auth/org). Re-enable when you need Storage buckets locally. |
| Stack still flaky on slow Docker | `npx supabase start --ignore-health-check`, then `npm run db:status`; give Postgres ~1–2 min on first boot |
| `23503` on `organization_members_user_id_fkey` when creating workspace | JWT `sub` is not in `auth.users` (usual: `db:reset` while browser still has old session). **Sign out** in the app (or clear site data), **sign in** again. Confirm `.env` `SUPABASE_URL` matches the running stack (`http://127.0.0.1:54321` for CLI). |
| `42P17` infinite recursion on `organization_members` | Fixed in `0005` — run `npm run db:reset` or `npx supabase migration up` after pull. |

## Verify (web E2E)

Requires local Supabase + `apps/web` (Playwright starts `web:serve` unless port 4201 is already in use).

```bash
npx nx e2e web-e2e --grep "tenant isolation"
npx nx e2e web-e2e --grep "invite flow"
npm run e2e:web:release
```

## Next step (roadmap)

- Seat limits backed by Postgres
- Hosted Supabase project + CI migration pipeline
