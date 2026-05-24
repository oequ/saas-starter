# Plan — `apps/web` full-stack backlog

Living plan for **saas-starter** `apps/web` (Supabase + ports).  
UI kit demo backlog remains in [ROADMAP.md](./ROADMAP.md).

Last updated: **2026-05-24**.

---

## Done

| Phase | Scope | Migrations / code |
|-------|--------|-------------------|
| **1 — Seat limits** | Postgres enforcement for invites/claims | `0007_org_seat_limits.sql` |
| **1.5 — Billing bridge** | Mock paywall ↔ `plan_id` / `seats_limit` | `0008_org_billing_plan.sql`, `WebBillingAdapter` |
| **2 — Stripe v1** | Hosted Checkout, Customer Portal, webhooks (Edge Functions) | `0009_stripe_billing.sql`, `supabase/functions/*`, [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) |

**Manual follow-up (not code):** Stripe test account, Price IDs, `supabase functions serve` + `stripe listen`, smoke with `STRIPE_ENABLED=true`.

**CI:** `e2e:web:release` stays mock (`STRIPE_ENABLED=false`).

Cursor plan archive: Stripe phase 2 implementation notes in `.cursor/plans/` (if present locally).

---

## Next — Stripe v2 (billing polish)

Previously «out of scope» for phase 2. Same stack: Edge Functions + webhooks + Postgres as source of truth for `plan_id` / `seats_limit`.

| # | Item | Notes |
|---|------|--------|
| 1 | **Real invoices from Stripe API** | Replace mock `listInvoices` when `stripeEnabled`; optional Edge Function `billing-list-invoices` or server-side Stripe SDK |
| 2 | **Cancel subscription in UI ↔ webhook** | Billing UI: cancel at period end; handle `customer.subscription.updated` / `deleted` (today cancel is mock-only) |
| 3 | **Per-seat pricing in Stripe** | Quantity on subscription line item; sync seat count with `organizations` / usage |
| 4 | **Embedded Checkout / Elements** | Alternative to hosted redirect; SetupIntent only if we add card-on-file outside Checkout |
| 5 | **E2E with Stripe** | Optional local/staging smoke; **not** in CI (keep mock path for `e2e:web:release`) |

Suggested PR order: **cancel + webhooks** → **invoices** → per-seat → embedded (only if product needs it).

---

## Done — Phase 3 (Supabase ports)

| PR | Scope | Migrations |
|----|--------|--------------|
| Shared | `email-usage-stats`, `buildMetricsDashboardFromEmails` in `@oequ/ports` | — |
| API keys | `SupabaseApiKeysAdapter` | `0010_organization_api_keys.sql` |
| Emails | `SupabaseEmailsAdapter`, billing snapshot email meters | `0011_outbound_emails.sql` |
| Metrics | `WebMetricsAdapter` (aggregates outbound emails) | — |
| Activation | `SupabaseActivationAdapter`, `create_organization` → `pending` | `0012_organization_activation.sql` |

`provideWebAdapters` uses `provideMockIntegrationsSupport()` (billing mock + integrations + support only).

---

## Then — Phase 3: Supabase for remaining ports (archived checklist)

Wire **metrics**, **API keys**, **activation/onboarding**, and **emails** the same way as **org**:

1. **Migrations** — tenant-scoped tables, default-deny RLS, `private` helpers, admin RPCs where needed  
2. **RPC / triggers** — business rules in Postgres (quotas, ownership, org membership checks)  
3. **Adapters** — `libs/data-access-supabase` implements ports; `provideWebAdapters` swaps mock → Supabase per domain  
4. **E2E** — `@web` specs for critical paths (tenant isolation pattern from org/billing)

| Port | UI surface (approx.) | Pattern reference |
|------|----------------------|-------------------|
| **Metrics** | Workspace metrics / usage | Org read RLS + snapshot RPCs |
| **API keys** | Settings → API keys | Org admin writes + hashed secrets |
| **Activation** | Post-signup onboarding | Auth-linked rows, claim flow like invitations |
| **Emails** | Usage / sending settings | Org-scoped quotas; optional Edge Function for provider later |

Order is flexible; a practical sequence:

1. **Metrics** (read-heavy, proves usage meters + RLS)  
2. **API keys** (admin writes, good RLS exercise)  
3. **Activation** (auth signup path)  
4. **Emails** (quotas + optional external provider)

Each slice: migration `001x_*` → adapter → drop mock for that port in `apps/web` only → `web-e2e` if user-facing.

---

## Explicitly later

- **YooKassa / multi-provider** — same ports pattern; provider-specific tables or `payment_provider` column (see architecture discussion)  
- **Hosted deploy** — Supabase project secrets, production webhook URL  
- **Demo app (`apps/demo`)** — stays mock unless we intentionally parity features  

---

## How to use

1. Pick **Stripe v2** row or **Phase 3** port.  
2. Open a PR with one vertical (migration + adapter + tests).  
3. Update this doc and [README.md](../README.md) capability table when shipped.
