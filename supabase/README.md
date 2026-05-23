# Supabase (local database)

Migrations implement **default-deny** on `public`, then explicit grants + RLS per table.

Official flow: [Local development with Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) — **Docker** runs the stack, **CLI** manages it.

## Migrations

| File | Purpose |
|------|---------|
| `0000_hardened_baseline.sql` | `REVOKE ALL` on `public` for `anon` / `authenticated`; grant `USAGE` only |
| `0001_init_orgs.sql` | `organizations`, `organization_members`, RLS read policies, `GRANT SELECT` |
| `0002_org_writes_rls.sql` | RPC `create_organization`, `invite_organization_member`, write RLS, invitations, JWT hook |

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

After changing `0002` or `config.toml`, run `npm run db:stop` then `npm run db:start` (or full `db:reset`).

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

## Verify tenant isolation

```bash
npx nx e2e web-e2e --grep "tenant isolation"
```

Requires local Supabase + `apps/web` (`npm run start:web` is started by the e2e target).

## Next step (roadmap)

- Auto-accept invitations on sign-up
- Org delete, seat limits backed by Postgres
- Hosted Supabase project + CI migration pipeline
