# ADR 0001: Supabase tenant isolation (orgs + RLS)

**Status:** Accepted (local dev)  
**Date:** 2026-05-22

## Context

`apps/web` must enforce B2B tenant boundaries: users only see organizations they belong to. UI talks to `OrgPort` / `AuthPort`; Supabase is an adapter detail.

## Decision

1. **Default-deny** on `public` (`0000`), then explicit grants per table (`0001`, `0002`).
2. **No permissive `INSERT` policies** on `organizations`. Creation goes through `create_organization()` (security definer).
3. **RLS** on `organizations`, `organization_members`, `organization_invitations` using `private.*` helpers (`is_org_member`, `is_org_admin`, `is_org_owner`).
4. **Invites:** `invite_organization_member()` — existing `auth.users` → member row; unknown email → `organization_invitations`.
5. **JWT org context:** `custom_access_token_hook` reads `user_metadata.active_org_slug` and sets `app_metadata.org` after membership check. Client updates metadata on workspace switch + `refreshSession()`.
6. **Client fallback:** until refresh completes, `SupabaseAuthAdapter.setSessionClaims()` mirrors active org from localStorage.

## Consequences

- Local dev requires `npm run db:reset` after pulling `0002` and restarting Supabase (hook in `config.toml`).
- `delete organization` and seat limits are still mock-only in the UI layer.
- Pending invitations do not auto-join on sign-up yet (manual SQL or future hook).

## Alternatives considered

- **Wide `INSERT` policies** — rejected (RLS foot-gun).
- **Org claim only in localStorage** — rejected (not authoritative across tabs/devices).
- **Edge Function hook** — deferred; Postgres hook is enough for local + hosted.
