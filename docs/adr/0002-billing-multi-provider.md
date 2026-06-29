# ADR 0002 — Multi-provider billing

**Status:** Accepted  
**Date:** 2026-05-24

## Context

`apps/web` ships with optional Stripe (hosted Checkout, Customer Portal, webhooks). Starters deployed in Russia or other regions may not use Stripe. We need a stable extension point so integrators can wire YooKassa, CloudPayments, bank transfer, or any provider **without forking UI**.

## Decision

### 1. UI contract stays provider-agnostic

[`BillingPort`](../../libs/ports/src/lib/billing.port.ts) remains the only billing API for Angular features (paywall, settings billing, banners). No Stripe types in `libs/features-org`.

### 2. Postgres is the source of truth

`organizations.plan_id` and `seats_limit` drive entitlements (seat limits, email quotas). Payment providers only **sync** state via service-role RPCs.

### 3. Provider-agnostic mirror table

Migration `0013_billing_multi_provider.sql`:

| Object | Role |
|--------|------|
| `organization_billing` | One row per org: `provider`, `external_customer_id`, `external_subscription_id`, subscription fields |
| `billing_events` | Idempotency: PK `(provider, external_event_id)` |
| `apply_billing_subscription` | Canonical webhook → plan + mirror upsert |
| `apply_stripe_subscription` | Thin wrapper (`provider = 'stripe'`) for Stripe Edge Functions |
| `link_organization_billing_provider` | Link customer before first checkout |

`organization_stripe` is removed; Stripe code uses `organization_billing` with `provider = 'stripe'`.

### 4. Deploy-time provider selection

`SupabaseConfig.billingProvider`: `'mock' | 'stripe' | 'custom'`.

- **`mock`** (default): mock checkout/cards; `update_organization_plan` for plan changes; CI/E2E.
- **`stripe`**: Edge Functions `billing-create-checkout`, `billing-create-portal`, `stripe-webhook`.
- **`custom`**: same UI as mock for payment flows until integrator adds Edge Functions; webhooks call `apply_billing_subscription` with their `provider` id (e.g. `yookassa`).

Legacy `stripeEnabled: true` maps to `billingProvider: 'stripe'`.

Tokens: `BILLING_PROVIDER_ID`, `STRIPE_BILLING_ENABLED` (= stripe only).

### 5. What integrators implement

See [BILLING_CUSTOM_PROVIDER.md](../BILLING_CUSTOM_PROVIDER.md):

1. Edge Function(s) for checkout/redirect (optional).
2. Webhook Edge Function: verify signature → `recordBillingEvent` → `apply_billing_subscription`.
3. Env + `apps/web` config: `billingProvider: 'custom'` (or keep `mock` and only sync via webhooks).

Do **not** change `BillingPort` unless adding cross-provider capabilities (document optional capability flags later).

## Consequences

- Stripe v2 work extends shared billing Edge Functions (`billing-rpc.ts`, `billing-invoices.ts`).
- Subscriptions: `0013` + `apply_billing_subscription`.
- Invoices: `0014_organization_invoices` for custom providers; Stripe reads live API in `billing-list-invoices` when `provider = 'stripe'`.
- Second real provider reuses `0013`/`0014`; provider-specific secrets live in Edge Function env.
- Demo app (`apps/demo`) unchanged; remains mock.

## References

- [STRIPE_LOCAL.md](../STRIPE_LOCAL.md)
- [BILLING_CUSTOM_PROVIDER.md](../BILLING_CUSTOM_PROVIDER.md)
- `supabase/functions/billing-custom-webhook.example/`
