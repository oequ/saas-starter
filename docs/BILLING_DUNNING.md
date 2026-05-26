# Billing — dunning and `past_due` policy

Operator and product reference for **failed renewals** on the Stripe path in `apps/web`. Complements [BILLING_PRE_LAUNCH.md](./BILLING_PRE_LAUNCH.md) and [STRIPE_LOCAL.md](./STRIPE_LOCAL.md).

Last updated: **2026-05-26**.

---

## Source of truth

| Layer | Role |
|-------|------|
| **Stripe** | Charges cards, Smart Retries, Customer Portal |
| **Postgres** | `organization_billing.subscription_status`, `current_period_end`, `organizations.plan_id` / `seats_limit` |
| **Sync** | `stripe-webhook` → `apply_billing_subscription` (including `invoice.payment_failed` → retrieve subscription → sync) |

The UI reads billing via `get_organization_billing_snapshot` — not Stripe directly.

---

## What happens when renewal fails

1. Stripe attempts to charge the default payment method at period end.
2. On failure, Stripe may retry (Smart Retries) and emits webhooks such as `invoice.payment_failed` and `customer.subscription.updated` (`status: past_due`).
3. This starter’s webhook handler syncs subscription status into Postgres.

**Nightly CI (`stripe:smoke:ci`, iter 3):** Test Clock advance + declining test PM + signed `invoice.payment_failed` → assert `subscription_status = past_due`. Does not run real Stripe Dashboard retries.

---

## UX today (as shipped)

| Surface | Behavior |
|---------|----------|
| **Banner** | Critical tone via [`billingStatusBanner`](../libs/ports/src/lib/billing.utils.ts) when `status === 'past_due'` |
| **Copy** | i18n `paywall.banner.past_due` — “Update billing details to restore full access.” |
| **CTA** | Links to **Settings → Billing** (Stripe Portal when `STRIPE_ENABLED`) |

---

## Access control gap (document before prod)

| Action | Blocked when `past_due`? |
|--------|-------------------------|
| View workspace / existing features | **No** |
| Invite members / seat bump | **No** |
| Upgrade via Checkout | Depends on Stripe/Portal (not gated in app RPC) |

There is **no grace-period timer** and **no hard feature lock** in this starter. Product should decide explicitly, for example:

- **Banner-only (current):** warn admins; rely on Stripe retries and Portal.
- **Soft lock:** block invites and `billing-update-subscription` while `past_due`.
- **Hard lock:** read-only workspace after N days (requires new guards + policy).

---

## Recommended pre-production decisions

1. **Grace period** — 0 / 3 / 7 days banner-only before restricting invites?
2. **Entitlements** — keep Team/Pro features during `past_due` or downgrade to Free?
3. **Emails** — Stripe dunning emails vs app transactional (outbound_emails)?
4. **Manual verify** — [BILLING_PRE_LAUNCH.md](./BILLING_PRE_LAUNCH.md) Test Clock + decline card in Dashboard.

---

## Manual verification (Stripe test mode)

1. Active subscription ([STRIPE_LOCAL.md](./STRIPE_LOCAL.md)).
2. Attach a [declining test payment method](https://docs.stripe.com/testing#declined-payments) or use Test Clock + `pm_card_chargeCustomerFail`.
3. Advance clock past `current_period_end` or wait for renewal attempt.
4. Confirm `invoice.payment_failed` in `stripe listen` (local) or Dashboard → Webhooks.
5. SQL: `select subscription_status, current_period_end from organization_billing where provider = 'stripe';`
6. App: past-due banner on workspace shell.

---

## Related code

| Piece | Path |
|-------|------|
| Webhook `invoice.payment_failed` | [`supabase/functions/stripe-webhook/index.ts`](../supabase/functions/stripe-webhook/index.ts) |
| API smoke | [`scripts/stripe-ci-smoke.mjs`](../scripts/stripe-ci-smoke.mjs) |
| Banner | [`libs/shell/src/lib/billing-status-banner.component.ts`](../libs/shell/src/lib/billing-status-banner.component.ts) |
