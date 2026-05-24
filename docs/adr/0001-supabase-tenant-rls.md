# ADR 0001: Supabase tenant isolation (orgs + RLS)

**Status:** Accepted (local dev)  
**Date:** 2026-05-22

## Context

`apps/web` must enforce B2B tenant boundaries: users only see organizations they belong to. UI talks to `OrgPort` / `AuthPort`; Supabase is an adapter detail.

## Decision

1. **Default-deny** on `public` (`0000`), then explicit grants per table (`0001`, `0002`).
2. **No permissive `INSERT` policies** on `organizations`. Creation goes through `create_organization()` (security definer).
3. **RLS** on `organizations`, `organization_members`, `organization_invitations` using `private.*` helpers (`is_org_member`, `is_org_admin`, `is_org_owner`).
4. **Invites:** `invite_organization_member()` — existing `auth.users` → member row; unknown email → `organization_invitations`. On sign-up (trigger on `auth.users`) or sign-in/sign-up RPC `claim_my_invitations()`, pending rows become `organization_members`.
5. **Seat limits (`0007`):** `organizations.seats_limit` (default 3). Used seats = active `organization_members` + pending `organization_invitations`. `invite_organization_member`, claim flows, and `BEFORE INSERT` triggers call `private.assert_org_seat_available`; overflow raises `P0001` (`seats exhausted`) mapped to `SEATS_EXHAUSTED` in the web adapter.
6. **Billing bridge (`0008`, `apps/web`):** `organizations.plan_id` drives `seats_limit` (free→3, pro→10, team→50). `get_organization_billing_snapshot` is authoritative for `seatsUsed` / cap in UI; mock paywall checkout/downgrade calls `update_organization_plan`.
7. **Billing (`0009` + `0013`, optional):** Edge Functions + webhooks update plan/seats via `apply_billing_subscription` (Stripe wrapper: `apply_stripe_subscription`). `billingProvider`: `mock` | `stripe` | `custom`. CI/E2E stay `mock`. See [STRIPE_LOCAL.md](../STRIPE_LOCAL.md), [BILLING_CUSTOM_PROVIDER.md](../BILLING_CUSTOM_PROVIDER.md), [ADR 0002](./0002-billing-multi-provider.md).
8. **Phase 3 ports (`0010`–`0012`, `apps/web`):** API keys, outbound emails (metrics source + simulate), activation gate on new workspaces. Adapters in `libs/data-access-supabase`; integrations/support stay mock.
7. **JWT org context:** `custom_access_token_hook` reads `user_metadata.active_org_slug` and sets `app_metadata.org` after membership check. Client updates metadata on workspace switch + `refreshSession()`.
8. **Client fallback:** until refresh completes, `SupabaseAuthAdapter.setSessionClaims()` mirrors active org from localStorage.
9. **Delete org:** owners may `DELETE` from `organizations` (RLS `orgs_delete_owner`); `SupabaseOrgAdapter.deleteOrganization()` uses the same check client-side.

## Consequences

- Local dev requires `npm run db:reset` after pulling migrations and restarting Supabase (hook in `config.toml`).
- Seat caps are enforced in Postgres; plan changes on `apps/web` sync the cap via `0008` (mock) or `0009` webhooks (Stripe).

## Alternatives considered

- **Wide `INSERT` policies** — rejected (RLS foot-gun).
- **Org claim only in localStorage** — rejected (not authoritative across tabs/devices).
- **Edge Function hook** — deferred; Postgres hook is enough for local + hosted.
