# Stripe billing (local, `apps/web`)

Hosted **Stripe Checkout** and **Customer Portal** run in Supabase Edge Functions. Postgres remains the source of truth for `organizations.plan_id` and `seats_limit` (`organization_billing` with `provider = 'stripe'`, migration `0013_billing_multi_provider.sql`).

For non-Stripe regions, see [BILLING_CUSTOM_PROVIDER.md](./BILLING_CUSTOM_PROVIDER.md).

## Prerequisites

- Stripe test account
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (`winget install Stripe.StripeCli` on Windows, or `npx` only for Supabase)
- **Docker Desktop** running
- Local Supabase: `npm run db:reset` (applies migrations through `0015_stripe_per_seat_seats_limit.sql`)
- Products/prices in Stripe Dashboard — see [Pricing](#pricing-pro--team) below

## Local runbook (4 terminals)

Run from the **repository root** (`C:\cursor\saas-starter` or clone path).

### Terminal 1 — database

```bash
npm run db:start
```

First time or after migration changes:

```bash
npm run db:reset
npm run db:status
```

Copy **Project URL** and **Publishable** key into `apps/web/src/app/supabase.settings.ts`, or export them before Terminal 4.

### Terminal 2 — Edge Functions + Stripe secrets

Create `supabase/.env` (gitignored; copy from `supabase/functions/.env.example`):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
```

```bash
npm run functions:serve
```

(`functions:serve` = `npx supabase functions serve --env-file supabase/.env`)

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### Terminal 3 — Stripe webhooks

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed
```

Copy `whsec_...` into `STRIPE_WEBHOOK_SECRET` in `supabase/.env`, then **restart** Terminal 2.

### Terminal 4 — Angular app (Stripe billing)

**Windows (cmd):**

```bat
set BILLING_PROVIDER=stripe
set STRIPE_ENABLED=true
node scripts/write-web-supabase-settings.mjs
npm run start:web
```

**PowerShell:**

```powershell
$env:BILLING_PROVIDER='stripe'
$env:STRIPE_ENABLED='true'
node scripts/write-web-supabase-settings.mjs
npm run start:web
```

Open http://localhost:4201 → sign in → **Settings → Billing**.

After Checkout, Stripe redirects to `/workspace/settings/billing?checkout=success`; webhooks update `plan_id` and `seats_limit`.

## Pricing (Pro / Team)

| Plan | Stripe price model | Checkout `quantity` | Postgres `seats_limit` |
|------|-------------------|---------------------|-------------------------|
| **Pro** | Flat monthly (e.g. $25) | `1` | `10` (plan cap) |
| **Team** | **Per seat** monthly (e.g. $49 / seat) | `max(1, seats_used)` capped at `50` | subscription item quantity |

Create **Team** price as recurring **per unit** (not flat). Example test amounts: Pro $25/mo flat, Team $49/mo per seat.

## Per-seat behavior (Team)

1. Paywall upgrade uses **current `seats_used`** (members + pending invites) for Checkout line item quantity.
2. Edge Function `billing-create-checkout` re-reads `seats_used` from Postgres (client hint is not trusted alone).
3. Webhooks pass subscription **quantity** into `apply_billing_subscription(..., p_seats_limit)` for Team.
4. **Pro** stays flat (`quantity: 1`, `seats_limit = 10`).

## Auto seat bump on invite (Team)

When **Team + Stripe** and `seats_used >= seats_limit`, **Members → Invite** shows a **confirm seat charge** dialog (prorated add-on copy), then `billing-update-subscription`, then `invite_organization_member`. Mock billing (`e2e:web:release`) skips the confirm step but still syncs seats.

Manual smoke (invite bump):

1. Subscribe to **Team** with one member (`quantity = 1`, `seats_limit = 1`).
2. **Members → Invite** a second email — confirm dialog → **Updating subscription…** → **Sending…**.
3. Stripe Dashboard: subscription `quantity = 2`; Billing: `seats_limit` 2.
4. `stripe listen`: `customer.subscription.updated`.

**Pro** at 10/10: invite stays blocked → paywall (flat price, no quantity bump).

## Auto seat decrease on remove (Team)

When **Team + Stripe** (or mock in CI) and `seats_limit > seats_used` after **Remove member**, Members calls `billing-update-subscription` with `seat_quantity = seats_used` (prorated credit).

Manual smoke (remove decrease):

1. Team workspace with **2** members (`quantity = 2`).
2. **Members → Remove** one non-owner member — **Updating subscription…** on the remove dialog.
3. Stripe Dashboard: `quantity = 1`; Billing reflects `seats_limit` 1.

## Downgrades

With Stripe enabled, paywall downgrades open **Customer Portal**. Seat limits update on subscription webhooks.

## Cancel subscription (in-app)

**Settings → Billing → Cancel subscription** → `billing-cancel-subscription` (cancel at period end + Postgres sync).

## Past invoices

**Settings → Billing → Past Invoices** → `billing-list-invoices` (Stripe API live for `billingProvider: 'stripe'`).

## Pre-launch critical cases

Before production billing: verify auto-renewal (Stripe Test Clock), failed payment → `past_due` UX, webhook idempotency, and per-seat sync — see [BILLING_DUNNING.md](./BILLING_DUNNING.md).

Nightly CI smoke does **not** replace Test Clock renewal testing.

## CI / E2E

| Check | Billing | When |
|-------|---------|------|
| PR / push [`ci.yml`](../.github/workflows/ci.yml) `web-e2e` | **mock** (`STRIPE_ENABLED` unset) | Every PR |
| Nightly [`stripe-smoke.yml`](../.github/workflows/stripe-smoke.yml) | **Stripe test API** (API-only, no browser) | Daily 04:00 UTC + manual |

### CI (nightly) — API smoke

Workflow: **Stripe smoke** (`workflow_dispatch` or cron). Not a required PR check.

**GitHub secrets** (repository settings):

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | Any `whsec_…` string; must match value written to `supabase/.env` in the job (used to sign synthetic webhook payloads — not from `stripe listen`) |
| `STRIPE_PRICE_TEAM` | Per-seat Team price id |
| `STRIPE_PRICE_PRO` | Pro price id (optional; enables `billing-create-checkout` assert in smoke) |

**What the job runs:** `supabase start` → `db reset` → `functions serve` → [`npm run stripe:smoke:ci`](../package.json) ([`scripts/stripe-ci-smoke.mjs`](../scripts/stripe-ci-smoke.mjs)):

1. Create user + org in Postgres  
2. Stripe **Test Clock** customer + Team subscription (`quantity: 1`)  
3. Signed `customer.subscription.updated` → `stripe-webhook`  
4. Assert `plan_id = team`, `seats_limit = 1`  
5. Replay the **same** `event.id` → response `duplicate: true`; snapshot unchanged (idempotency)  
6. `billing-update-subscription` → assert `seats_limit = 2`  
7. POST `stripe-webhook` without signature (and with wrong secret) → `400`  
8. Second user invokes `billing-update-subscription` for first user's `organization_id` → `403`  
9. **Test Clock** advance → signed `subscription.updated` → `current_period_end` advanced in Postgres  
10. Declining PM + second advance → signed `invoice.payment_failed` → `subscription_status = past_due`  
11. `billing-update-subscription` while `past_due` → `409` `payment_past_due`  
12. `invite_organization_member` while `past_due` → RPC error `billing payment past due`  

Optional: `STRIPE_SMOKE_SKIP_TEST_CLOCK=true` skips steps 9–12 (local fallback if Test Clock API fails).

Dunning policy: [BILLING_DUNNING.md](./BILLING_DUNNING.md).

**Local replay** (same as CI, with Terminal 1–2 from runbook above):

```bash
npm run db:start && npm run db:reset
npm run functions:serve
# another shell:
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...
export STRIPE_PRICE_TEAM=price_...
export STRIPE_PRICE_PRO=price_...
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=...   # from: supabase status -o env
export SUPABASE_ANON_KEY=...
npm run stripe:smoke:ci
```

## Functions

| Function | JWT | Role |
|----------|-----|------|
| `billing-create-checkout` | yes | Checkout Session (`quantity` per plan) |
| `billing-create-portal` | yes | Customer Portal |
| `billing-cancel-subscription` | yes | Cancel at period end |
| `billing-update-subscription` | yes | Bump Team subscription quantity (invite flow) |
| `billing-list-invoices` | yes | Invoice list |
| `stripe-webhook` | no | Idempotent sync via `apply_billing_subscription` |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `stripe` / `supabase` not found | Use `npx stripe`, `npx supabase`, or `npm run functions:serve` |
| `STRIPE_SECRET_KEY is not set` | `npm run functions:serve` **with** `--env-file supabase/.env` |
| Mock “Simulate payment” dialog | Regenerate settings with `BILLING_PROVIDER=stripe`; restart `start:web` |
| Requests Pending on `/functions/v1/...` | Terminal 2 not running or wrong `STRIPE_WEBHOOK_SECRET` |
| `demo@example.com` login fails | Use register + workspace, or seed `demo` after `db:reset` |

Test card: `4242 4242 4242 4242`, any future expiry, any CVC — [Stripe testing](https://docs.stripe.com/testing#cards).
