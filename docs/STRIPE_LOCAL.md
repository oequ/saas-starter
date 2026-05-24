# Stripe billing (local, `apps/web`)

Hosted **Stripe Checkout** and **Customer Portal** run in Supabase Edge Functions. Postgres remains the source of truth for `organizations.plan_id` and `seats_limit` (`organization_billing` with `provider = 'stripe'`, migration `0013_billing_multi_provider.sql`).

For non-Stripe regions, see [BILLING_CUSTOM_PROVIDER.md](./BILLING_CUSTOM_PROVIDER.md).

## Prerequisites

- Stripe test account
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- Local Supabase: `npm run db:reset`
- Products/prices in Stripe Dashboard for **Pro** and **Team** (recurring monthly)

## 1. Edge Function secrets

Create `supabase/.env` (gitignored) or set secrets for local serve:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from stripe listen (below)
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically when using `supabase functions serve`.

## 2. Start stack

```bash
npm run db:reset
supabase functions serve
```

In another terminal:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## 3. Enable Stripe in the web app

```bash
set STRIPE_ENABLED=true
node scripts/write-web-supabase-settings.mjs
npm run start:web
```

Sign in, open **Settings → Billing**, upgrade via paywall. After Checkout, Stripe redirects to `/workspace/settings/billing?checkout=success`; the webhook updates Postgres plan and seat limits.

## 4. Downgrades

With `STRIPE_ENABLED=true`, paywall downgrades open **Customer Portal** (cancel or change plan in Stripe). Seat limits update when subscription webhooks are processed.

## 5. Cancel subscription (in-app)

**Settings → Billing → Cancel subscription** calls `billing-cancel-subscription` (sets `cancel_at_period_end` on the Stripe subscription and syncs Postgres immediately).

Manual smoke:

1. Upgrade via Checkout (Pro or Team).
2. Cancel in the billing UI — banner **Cancels at the end of the current billing period** appears; `plan_id` stays paid until period end.
3. `stripe listen` should receive `customer.subscription.updated` (webhook idempotent with the Edge Function sync).
4. After period end (or Stripe test clock), `customer.subscription.deleted` downgrades the org to **Free** in Postgres.

## 6. Past invoices

**Settings → Billing → Past Invoices** uses `billing-list-invoices`. For `billingProvider: 'stripe'`, invoices are fetched live from the Stripe API (not cached in Postgres in v1). After Checkout, open Billing and confirm rows appear with PDF download links.

Custom providers use `organization_invoices` instead — see [BILLING_CUSTOM_PROVIDER.md](./BILLING_CUSTOM_PROVIDER.md).

## CI / E2E

`e2e:web:release` keeps `STRIPE_ENABLED` unset (mock checkout). No Stripe keys in CI.

## Functions

| Function | JWT | Role |
|----------|-----|------|
| `billing-create-checkout` | yes | Creates Checkout Session (`mode=subscription`) |
| `billing-create-portal` | yes | Customer Portal session |
| `billing-cancel-subscription` | yes | Cancel at period end + Postgres sync |
| `billing-list-invoices` | yes | List invoices (Stripe API or `organization_invoices`) |
| `stripe-webhook` | no | Verifies signature, idempotent `billing_events`, `apply_billing_subscription` (`provider = stripe`) |
