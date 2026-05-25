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

| # | Item | Status |
|---|------|--------|
| 1 | **Per-seat pricing in Stripe** | **Done** — Team Checkout `quantity = seats_used`; webhook → `p_seats_limit` (`0015`); [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) runbook |
| 2 | **Sync quantity on invite** | **Done** — `billing-update-subscription` + Members invite auto-bump (Team / Stripe) |
| 3 | **Embedded Checkout / Elements** | Later — alternative to hosted redirect |
| 4 | **E2E with Stripe** | Optional local smoke; **not** in CI |

**Done (Stripe v2):** Cancel subscription, invoices, multi-provider (`0013`/`0014`), per-seat Team checkout, seat sync on invite.

---

## Done — Phase 3 (Supabase ports)

| PR | Scope | Migrations |
|----|--------|--------------|
| Shared | `email-usage-stats`, `buildMetricsDashboardFromEmails` in `@oequ/ports` | — |
| API keys | `SupabaseApiKeysAdapter` | `0010_organization_api_keys.sql` |
| Emails | `SupabaseEmailsAdapter`, billing snapshot email meters | `0011_outbound_emails.sql` |
| Metrics | `WebMetricsAdapter` (aggregates outbound emails) | — |
| Activation | `SupabaseActivationAdapter`, `create_organization` → `pending` | `0012_organization_activation.sql` |
| E2E | Tenant isolation (`api-keys-tenant`, `emails-tenant`); deep-link smoke in `release-smoke` | — |
| Guards | `ensureOrganizationsLoaded()` in workspace + onboarding guards (reload hydration) | — |

`provideWebAdapters` uses `provideMockIntegrationsSupport()` (billing mock + integrations + support only).

---

## Billing — multi-provider (done)

| Item | Location |
|------|----------|
| Schema + RPC | `0013_billing_multi_provider.sql` — `organization_billing`, `apply_billing_subscription` |
| Stripe | Unchanged UX; uses `provider = 'stripe'` |
| Custom / RF | `billingProvider: 'custom' \| 'mock'` — [BILLING_CUSTOM_PROVIDER.md](./BILLING_CUSTOM_PROVIDER.md), [ADR 0002](./adr/0002-billing-multi-provider.md) |
| Example webhook | `supabase/functions/billing-custom-webhook.example/` |
| Invoices | `0014_organization_invoices.sql`, `billing-list-invoices` |

YooKassa and others: implement as `provider = 'yookassa'` (or your slug); invoices via `upsert_organization_invoice`.

## Explicitly later

- **Hosted deploy** — Supabase project secrets, production webhook URL  
- **Demo app (`apps/demo`)** — stays mock unless we intentionally parity features  

---

## How to use

1. Pick a **Stripe v2** row (Phase 3 ports are done).  
2. Open a PR with one vertical (migration + adapter + tests).  
3. Update this doc and [README.md](../README.md) capability table when shipped.
