# Plan — `apps/web` full-stack backlog

Living plan for **saas-starter** `apps/web` (Supabase + ports).  
UI kit demo backlog remains in [ROADMAP.md](./ROADMAP.md).

Last updated: **2026-05-25**.

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
| 4 | **Stripe API smoke in CI** | **Done (nightly)** — [stripe-smoke.yml](../.github/workflows/stripe-smoke.yml) + `stripe:smoke:ci`; **not** PR-blocking; no Playwright Checkout |

**Done (Stripe v2):** Cancel subscription, invoices, multi-provider (`0013`/`0014`), per-seat Team checkout, seat sync on invite, **seat decrease on remove**, **revoke pending invite + seat decrease**, **confirm before Stripe seat charge**, **mock e2e Team seat bump** (`billing-seats-sync.spec.ts`).

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

## Starter-ready vs production

**Ready as a SaaS starter** (clone, local dev, extend): auth, multi-tenant orgs, seat limits, mock billing + CI (`pre-release:web`), optional Stripe (Checkout, Portal, Team per-seat sync on invite/remove).

**Not “production out of the box”** without operator work — track below.

---

## Billing pre-launch (critical cases)

Before production Stripe: [BILLING_PRE_LAUNCH.md](./BILLING_PRE_LAUNCH.md) — auto-renewal (Test Clock), failed payments, webhook integrity, seat sync, and what nightly CI does **not** cover.

| P | Item | Status |
|---|------|--------|
| ~~P0 Auto-renewal CI~~ | **Done (iter 3)** — Test Clock advance in `stripe:smoke:ci`; manual UI still on checklist |
| P0 | Failed payment / dunning UX | Partial — iter 3 smoke + [BILLING_DUNNING.md](./BILLING_DUNNING.md); feature lock still planned |
| ~~P1 Webhook idempotency~~ | **Done (iter 1)** — duplicate `event.id` in `stripe:smoke:ci` |
| ~~P1 Billing integrity smoke~~ | **Done (iter 2)** — unsigned/bad-signature webhook 400; cross-org update 403 |
| ~~P1 Dunning policy doc~~ | **Done (iter 3)** — [BILLING_DUNNING.md](./BILLING_DUNNING.md) |
| P1 | `past_due` feature lock (grace, block invites) | Planned — implement per dunning doc |

---

## Explicitly later (not blocking starter)

| Item | Notes |
|------|--------|
| **Prod deploy** | Supabase hosted project, Edge Function secrets (`STRIPE_*`), production Stripe webhook URL, env for `apps/web` — see deploy runbook when added |
| **Stripe in PR CI** | `e2e:web:release` stays **mock** only |
| **Stripe nightly CI** | API smoke — [stripe-smoke.yml](../.github/workflows/stripe-smoke.yml) (webhook + `billing-update-subscription`); **not** calendar renewal — [BILLING_PRE_LAUNCH.md](./BILLING_PRE_LAUNCH.md) |
| **Manual Stripe smoke (UI)** | Operator-run: `functions serve`, `stripe listen`, `BILLING_PROVIDER=stripe` — full Checkout + Members flows — [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) |
| ~~**Cancel pending invite**~~ | **Done** — Members → Revoke invitation; per-seat seat sync on revoke (mock + Stripe) |
| **`apps/demo` parity** | Demo stays mock-first; not full feature parity with `apps/web` |
| **Embedded Checkout / Elements** | Alternative to hosted Checkout redirect (Stripe v2 row #3) |
| **Custom providers in prod** | YooKassa etc. — implement `provider` slug + webhooks per [BILLING_CUSTOM_PROVIDER.md](./BILLING_CUSTOM_PROVIDER.md) |

---

## UI readiness

Per-route control matrix for **`apps/web`** (what is wired vs stub/mock/UI-only): [UI_READINESS.md](./UI_READINESS.md). Update when shipping UI fixes.

**Done:** Forgot password + `/auth/reset-password` (Supabase `resetPasswordForEmail`, Mailpit local) — [supabase/README.md](../supabase/README.md#password-reset-appsweb).

**Done:** Workspace logo in General — `organizations.logo_url` (`0016`) + `SupabaseOrgAdapter.update`.

**Done:** Change password on `/account/security` — `AuthPort.changePassword` (reauth + `updateUser`, session kept).

---

## How to use

1. Pick a row from **Explicitly later** or **Stripe v2** (only Embedded Checkout remains optional).  
2. Open a PR with one vertical (migration + adapter + tests + docs).  
3. Update this doc, [UI_READINESS.md](./UI_READINESS.md), and [README.md](../README.md) capability table when shipped.
