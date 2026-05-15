# Supabase (local database)

Migrations implement **default-deny** on `public`, then explicit grants + RLS per table.

## Migrations

| File | Purpose |
|------|---------|
| `0000_hardened_baseline.sql` | `REVOKE ALL` on `public` for `anon` / `authenticated`; grant `USAGE` only |
| `0001_init_orgs.sql` | `organizations`, `organization_members`, RLS read policies, `GRANT SELECT` |

There are **no** `WITH CHECK (true)` insert policies. Demo rows are seeded as superuser, not via a hole in RLS.

## Setup

Run all CLI commands from the **repository root** (the folder that contains this `supabase/` directory), not from inside `supabase/`.

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Init once if `supabase/config.toml` is missing:

   ```bash
   supabase init
   ```

3. Start the local stack and apply migrations + seed:

   ```bash
   supabase start
   supabase db reset
   ```

4. Copy API URL and anon key into the repo root `.env` (see `.env.example`).

> **Upgrading from the old `20250513180000_init_orgs` migration?** Dev only: run `supabase db reset` so `0000` / `0001` apply cleanly. Do not reset a shared remote without a plan.

## After first sign-up (link yourself to `demo`)

`seed.sql` creates org slug **`demo`**. It does not know your `auth.users.id` yet.

In **SQL Editor** (local: Studio → SQL) or `psql`, run once (replace the UUID):

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

Then open the app: `/orgs/demo` should show **Demo Organization**.

## Verify hardened baseline (learning check)

As an authenticated user **without** a membership row, `select * from organizations` returns **no rows** (RLS), not an error.

Try inserting an org from the client (e.g. Table Editor as authenticated): it should **fail** — no `INSERT` grant and no insert policy.

## Next step (roadmap)

- `0002` — invites, entitlements, `private.*` helpers (see design repo `ARCHITECTURE.md` §2)
- Tenant-isolation E2E in `apps/web-e2e`
