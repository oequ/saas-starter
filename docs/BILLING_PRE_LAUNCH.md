# Billing — critical cases & pre-launch plan

Living checklist for **operators, product, and engineering** before treating Stripe billing as production-ready on `apps/web`.

Related: [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) (local runbook), [ADR 0002](./adr/0002-billing-multi-provider.md) (Postgres as source of truth), [UI_READINESS.md](./UI_READINESS.md) (control matrix), [APPS_WEB_PLAN.md](./APPS_WEB_PLAN.md) (backlog).

Last updated: **2026-05-26**.

---

## Who owns what

| Concern | Owner in this starter |
|---------|------------------------|
| Recurring charge / **auto-renewal** | **Stripe** (subscription `mode: subscription`) |
| Plan + seat entitlements in app | **Postgres** (`organizations.plan_id`, `seats_limit`) synced via webhooks / RPC |
| Card storage (PAN, CVV) | **Never in our DB** — Stripe Customer + Portal or future SetupIntent |
| PR / merge CI | **Mock billing** only (`e2e:web:release`) |
| Nightly Stripe API smoke | Webhook + seat sync — **not** calendar renewal ([`stripe-ci-smoke.mjs`](../scripts/stripe-ci-smoke.mjs)) |

**Business-critical:** auto-renewal drives MRR. **Engineering-critical:** Stripe and Postgres stay in sync; webhooks are idempotent; failed payments have a defined UX.

---

## Critical cases — business

| Case | Risk if wrong |
|------|----------------|
| Auto-renewal (next period charged) | No revenue; or double charge / disputes |
| Failed payment (`past_due`, card declined) | Free premium or abrupt lockout without warning |
| Cancel / refund expectations | User charged after “cancel”; chargebacks |
| Invoices & tax (B2B) | Cannot close enterprise deals |
| Upgrade / downgrade / proration | Wrong amount; trust loss |
| Per-seat (Team) billing | Over/under-charging for headcount |
| Chargebacks & fraud | Revenue loss; Stripe Radar helps; process still yours |

---

## Critical cases — engineering

| Case | Risk if wrong |
|------|----------------|
| Webhook missed or duplicated | `plan_id` / `seats_limit` ≠ Stripe; wrong entitlements |
| Source of truth | UI or client must not be authoritative — use `apply_billing_subscription` |
| Idempotency | `billing_events (provider, external_event_id)` — replay must be safe |
| Race: checkout vs invite | User on wrong plan or seats before sync completes |
| `cancel_at_period_end` | Access until period end vs immediate downgrade — must match Stripe |
| `past_due` / `invoice.payment_failed` | Undefined product behavior (banner, grace, hard block) |
| Secrets & PCI | No raw card data in Postgres or logs |
| Mock vs Stripe in CI | Passing PR does **not** prove Stripe renew or Checkout UI |

---

## Covered in repo today (Stripe path)

| Case | Status | Where |
|------|--------|--------|
| Hosted Checkout (recurring) | OK | `billing-create-checkout`, `mode: subscription` |
| Webhook sync to Postgres | OK | `stripe-webhook`, `apply_billing_subscription` |
| Cancel at period end | OK | `billing-cancel-subscription` |
| Customer Portal (cards, plan) | OK | `billing-create-portal`; Payment Methods UI hidden when Stripe on |
| Team per-seat quantity | OK | Checkout + `billing-update-subscription` + webhook `p_seats_limit` |
| Seat bump on invite / decrease on remove | OK | Members UI + Edge Function |
| Webhook idempotency table | OK | `billing_events` |
| Nightly API smoke | Partial | Create sub + webhook sync + **idempotency** + **past_due** + seat bump — **no renew** |
| PR e2e | Mock only | No real Stripe |

---

## Gaps (plan before prod)

Priority for the next billing hardening work:

| P | Item | Suggested work |
|---|------|----------------|
| **P0** | **Auto-renewal verified** | **CI (iter 3):** Test Clock advance + signed `subscription.updated` → `current_period_end` in Postgres. Manual: Dashboard Test Clock + `stripe listen` for Billing UI. |
| **P0** | **Failed payment / dunning** | **Partial (iter 3)** — smoke: Test Clock + `invoice.payment_failed` → `past_due`; policy doc [BILLING_DUNNING.md](./BILLING_DUNNING.md). Still needed: grace period, feature lock in app. |
| **P1** | Webhook failure ops | Alert if webhook 5xx; Stripe Dashboard retry; runbook |
| ~~P1 Duplicate webhook~~ | **Done (iter 1)** — `stripe-ci-smoke` replays same `event.id` |
| ~~P1 Webhook / org integrity (CI)~~ | **Done (iter 2)** — unsigned + bad signature → 400; cross-org `billing-update-subscription` → 403 |
| ~~P1 `past_due` policy doc~~ | **Done (iter 3)** — [BILLING_DUNNING.md](./BILLING_DUNNING.md) (banner vs access gap) |
| **P1** | `past_due` feature lock | Implement guards (invites, seat bump) per product decision in dunning doc |
| **P2** | In-app payment methods | Only if not using Portal — SetupIntent + Elements; store `pm_` + last4 only |
| **P2** | Browser Checkout in CI | Optional Playwright + test clock or Stripe test mode (heavy; keep nightly API-only) |

---

## Pre-launch checklist (operator)

Run in **Stripe test mode** with [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) four-terminal setup unless noted.

### Revenue path

- [ ] **Checkout** — Upgrade to Pro or Team; redirect `?checkout=success`; `plan_id` and `seats_limit` correct in app and `organization_billing`.
- [ ] **Auto-renewal (manual UI)** — Test Clock → advance one billing period → Billing UI shows new period. **CI (iter 3):** `stripe:smoke:ci` advances clock + signed webhook → `current_period_end` forward in Postgres.
- [ ] **Failed renewal (full)** — Decline test card in Dashboard; confirm Portal + banner. **CI (iter 3):** Test Clock + `invoice.payment_failed` → `past_due`. Policy: [BILLING_DUNNING.md](./BILLING_DUNNING.md).

### Lifecycle

- [ ] **Cancel at period end** — In-app cancel → `cancel_at_period_end: true`; still paid until period end; after period → free/downgrade via webhook.
- [ ] **Portal** — Manage in Stripe: update card, cancel, view invoices (if used in prod).

### Seats (Team)

- [ ] **Invite over limit** — Confirm dialog → quantity bump → invite succeeds; Stripe `quantity` matches `seats_limit`.
- [ ] **Remove member** — Quantity decreases when `seats_limit > seats_used`.
- [ ] **Revoke pending invite** — Seat freed (existing e2e: `billing-seats-sync`).

### Integrity

- [ ] **Webhook secret** — Prod endpoint + `STRIPE_WEBHOOK_SECRET` configured in production.
- [x] **Reject unsigned / bad signature** — **CI (iter 2):** `stripe:smoke:ci` POST without `Stripe-Signature` or wrong secret → `400`.
- [x] **Wrong org** — **CI (iter 2):** non-admin JWT cannot `billing-update-subscription` on another `organization_id` → `403`. Manual: spot-check other billing functions.
- [x] **Idempotency** — **CI:** `npm run stripe:smoke:ci` replays same `event.id`; Postgres unchanged.

### CI expectations (do not over-trust)

- [ ] **`e2e:web:release`** passes — mock billing only.
- [x] **`stripe:smoke:ci`** — sync, idempotency, seat bump, integrity (iter 2), Test Clock renewal + `invoice.payment_failed` (iter 3); **does not** replace browser Checkout or manual Billing UI.
- [ ] GitHub secrets set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_TEAM`, (`STRIPE_PRICE_PRO` optional).

---

## How to verify auto-renewal (manual)

1. Complete [STRIPE_LOCAL.md](./STRIPE_LOCAL.md) setup; create an active subscription (Checkout or Dashboard).
2. Stripe Dashboard → **Test clocks** → create clock → attach customer/subscription (or new test customer on clock).
3. **Advance time** past `current_period_end`.
4. Confirm: new **Invoice** in Stripe; `stripe listen` shows `customer.subscription.updated` (and/or `invoice.paid`).
5. SQL: `select subscription_status, current_period_end, cancel_at_period_end from organization_billing where provider = 'stripe';`
6. App: **Settings → Billing** reflects new period.

---

## Dunning policy

See [BILLING_DUNNING.md](./BILLING_DUNNING.md) — `past_due` banner, access gaps, and pre-prod decisions (grace, feature lock).
