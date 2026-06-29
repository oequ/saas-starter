# ADR 0004 — Public API usage units (metered sandbox)

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Integrators and downstream products need a **real** HTTP API surface in the OSS starter — not only in-app mock adapters. Buyers evaluating the repo should see:

- workspace API keys (`oeq_*` secrets, hashed at rest);
- a metered endpoint that charges **generic usage units**;
- an audit trail (`usage_events`, `demo_runs`);
- rate limits and service-role-only table access.

AI-specific **generation credits** belong in the commercial AI Starter layer ([ADR 0002](./0002-billing-multi-provider.md) covers billing providers; credits ledger is downstream).

Studio already exposes API keys at `/workspace/api-keys` (migration `0010`). This ADR adds the **public REST** path used by external clients and (in a later PR) the developer console.

## Decision

### 1. OSS meter = usage units, not credits

| Concept | OSS (`saas-starter`) | AI extension (`ai-saas-starter`) |
|---------|----------------------|----------------------------------|
| Balance table | `usage_unit_balances` | `credit_balances` |
| Metered demo endpoint | `POST /v1/demo-runs` (1 unit) | `POST /v1/generations` (credits) |
| `GET /v1/account` | `usage_units` only | adds `credits` |

### 2. Postgres primitives (migrations `0028`–`0031`)

- `verify_organization_api_key` — service-role RPC; SHA-256 of `oeq_*` secret; updates `last_used_at`.
- `ensure_api_project` — idempotent `api-default` project for org (uses `organization_projects` from `0027`).
- `api_rate_limit_windows` + `consume_public_api_rate_limit` — per-key read/write buckets per UTC minute.
- `usage_unit_balances`, `usage_events`, `demo_runs`, `submit_public_demo_run`.
- Console RPCs: `get_org_usage_unit_balance`, `list_org_api_usage_events` (authenticated members; used in PR 3 UI).

Direct `SELECT` on metering tables is **revoked** from `authenticated`; Edge uses `service_role`.

### 3. Edge Function `public-v1`

Single Deno entrypoint mounted at `/functions/v1/public-v1/v1/*`:

- `GET /account`
- `POST /v1/demo-runs`, `GET /v1/demo-runs/{id}`

JWT verification disabled at the gateway (`verify_jwt = false`); auth is **API key only** via `Authorization: Bearer oeq_…`.

### 4. Ports

`UsageUnitsPort` in `@oequ/ports` + `SupabaseUsageUnitsAdapter` for future console UI (PR 3). PR 1 ships the port so features never touch Supabase directly.

### 5. Proof

- OpenAPI: `openapi/public-v1.yaml` (OSS paths only).
- HTTP smoke: `npm run test:demo-runs-http` (create key → demo-runs → balance −1).
- CI: smoke runs in the `web-e2e` job after Edge is served locally.

## Consequences

**Positive**

- OSS repo demonstrates production-shaped API design (hashing, metering, rate limits, RLS).
- AI Starter can merge upstream and **extend** `GET /account` and OpenAPI without forking keys/metering.
- Vertical forks get a runnable sandbox API before adding domain logic.

**Negative / trade-offs**

- Local dev requires Docker + `supabase functions serve` for HTTP smoke (same as billing Edge Functions).
- `ensure_api_project` creates a default project per org on first API call — acceptable for console/generation extension later.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Use generation credits as OSS meter | Couples OSS to AI schema; wrong open-core boundary |
| Anon-only demo endpoint without keys | Does not demonstrate real integrator flow |
| GraphQL or tRPC | REST + OpenAPI is the console contract in AI Starter iteration 1 |
| Skip rate limits in OSS | Weak showcase; trivial to abuse in shared demos |

## References

- [docs/PUBLIC_API.md](../PUBLIC_API.md) — operator runbook
- [openapi/public-v1.yaml](../../openapi/public-v1.yaml)
- Internal execution tracker: `oequ-platform` workstream `oss-api-console` (not linked from this public repo)
