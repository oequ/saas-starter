# Quality self-assessment

Assessment of **angular-saas-starter-ui** against [Quality Framework v1.0](https://github.com/oequ/quality-framework).

| Field | Value |
|-------|--------|
| **Project** | Oequ SaaS Starter |
| **Rubric version** | Quality Framework v1.0 |
| **Assessment date** | 2026-05-26 |
| **Assessed by** | automated audit + manual review |
| **Total score** | **721 / 1000** |
| **Maturity level** | Score qualifies for L1; **Must gates not yet met** (see below) |

## Summary

This Angular 21 + Nx 22 monorepo implements ports-and-adapters architecture with strong SaaS domain coverage: multi-tenant workspaces, billing via port, members lifecycle, RBAC guards, and onboarding flows. Playwright E2E covers critical paths across both demo and web apps. Signal-first components, built-in control flow, and `resource()` loaders are used throughout.

**Score exceeds the L1 threshold (>600), but three Must-gate categories have gaps:**

- **Architecture:** `libs/ports` imports `@angular/core` (for `InjectionToken`) and `rxjs` — fails A1 strict framework-free check.
- **Security:** Demo uses Supabase `localStorage` JWT (S5), no CSRF config (S6), CSP has `unsafe-inline` (S1 partial). These are documented demo exceptions; production deployments require operator hardening.
- **Angular:** Minor gaps in form typing (NG7 partial) and a few remaining `subscribe()` patterns (NG6 partial).

## Category scores

| Category | Max | Earned | % |
|----------|-----|--------|---|
| Architecture & boundaries | 200 | 167 | 84% |
| Security & privacy | 200 | 104 | 52% |
| Angular platform | 150 | 128 | 85% |
| SaaS domain | 150 | 116 | 77% |
| Testing & CI | 100 | 71 | 71% |
| UX & design system | 100 | 83 | 83% |
| Performance & a11y | 50 | 29 | 57% |
| Documentation & OSS | 50 | 23 | 46% |
| **Total** | **1000** | **721** | **72%** |

Scoring method: [docs/scoring.md](https://github.com/oequ/quality-framework/blob/main/docs/scoring.md)

## Must criteria — Architecture

| ID | Criterion | Result | Evidence |
|----|-----------|--------|----------|
| A1 | Framework-free ports | **Fail** | `libs/ports` imports `@angular/core` (`InjectionToken`) and `rxjs` (`Observable`) in port files. Port *interfaces/types* are framework-free; DI token declarations are Angular-specific. |
| A2 | Nx module boundaries | **Pass** | `eslint.config.mjs` has real `depConstraints` per tag (7 layers); CI runs `nx lint`. |
| A3 | Injection tokens | **Pass** | `AUTH_PORT`, `ORG_PORT`, `BILLING_PORT`, `EMAILS_PORT`, `METRICS_PORT`, etc. exported from `libs/ports`; features consume via `inject()`. |
| A4 | Mock adapters isolated | **Pass** | `libs/adapters-mock` with `provideDemoAdapters()`. Demo runs without backend. |
| A5 | Shell isolation | **Pass** | `libs/shell` imports only `@oequ/ports`, `@oequ/i18n`, and UI primitives. No feature imports. |
| A6 | Acyclic dependencies | **Pass** | Tag-based boundaries block illegal edges. No cross-feature imports. |
| A11 | Feature-sliced libraries | **Pass** | `libs/features-auth` (auth domain) and `libs/features-org` (workspace/billing domain). |
| A12 | Design system boundary | **Pass** | Features use `@spartan-ng/helm/*` primitives from `libs/ui`. Design tokens via CSS variables. |

## Must criteria — Security

| ID | Criterion | Result | Evidence |
|----|-----------|--------|----------|
| S1 | Strict CSP | **Partial** | CSP exists as `<meta>` tag in both apps; allows `style-src 'unsafe-inline'`. No HTTP response headers. |
| S3 | No bypassSecurityTrustHtml | **Pass** | Zero usages. Banned in AGENTS.md. |
| S5 | Secure token storage | **Fail** | Supabase-js stores JWT in `localStorage` (default). Demo exception — production requires HttpOnly cookies or BFF. |
| S6 | CSRF protection | **Fail** | No `withXsrfConfiguration` or CSRF config. Demo exception — Supabase client handles auth internally. |
| S7 | Auth interceptor | **Partial** | No Angular `HttpInterceptor`. Supabase-js attaches tokens centrally within its client. |
| S8 | No dynamic code execution | **Pass** | No `eval()` or `new Function()` in source. |
| S9 | Guards are UX only | **Pass** | AGENTS.md and README document that backend RLS enforces authorization. |

## Must criteria — Angular

| ID | Criterion | Result | Evidence |
|----|-----------|--------|----------|
| NG3 | Standalone-only | **Pass** | Zero `@NgModule` in source. `bootstrapApplication()` everywhere. |
| NG4 | Signal inputs/outputs | **Pass** | Zero `@Input`/`@Output` decorators. `input()`, `output()` used throughout. |
| NG6 | Derived state via computed | **Partial** | 100+ `computed()` usages. Eight `subscribe()` calls remain for form `valueChanges` — should migrate to `toSignal()`. |
| NG7 | Typed reactive forms | **Partial** | `FormControl` with `nonNullable` and union types, but no explicit `FormGroup<T>` interfaces. |
| NG8 | Functional guards | **Pass** | All guards are `CanActivateFn` exports in `shell.guards.ts`. |
| NG9 | Built-in control flow | **Pass** | `@if`, `@for`, `@switch` everywhere. Zero `*ngIf`/`*ngFor`. |
| NG10 | track in @for | **Pass** | All 40+ `@for` blocks include `track` expressions. |
| NG11 | Lazy routes | **Pass** | `loadComponent` on ~25 routes per app. |

## Should / Could highlights

| ID | Category | Result | Notes |
|----|----------|--------|-------|
| A7 | Arch | Partial | Barrel exports exist; UI consumed via `@spartan-ng/helm/*` not `@oequ/ui`. |
| A8 | Arch | Pass | `PortResult<T>` + `PortError` with `portOk`/`portErr` helpers. |
| A9 | Arch | Partial | Mapping in adapters; one dedicated mapper file, rest inline. |
| NG1 | Angular | Pass | No `zone.js` in polyfills or config. |
| NG2 | Angular | Fail | No `provideZonelessChangeDetection()` in app configs. |
| NG5 | Angular | Pass | 13 `resource()` usages across features and shell. |
| NG12 | Angular | Pass | Zero `markForCheck` calls. |
| T1 | Testing | Pass | Playwright E2E: auth, org switch, billing, members, seat limits. |
| T4 | Testing | Pass | Port tests are framework-free (`billing.utils.spec.ts`). |
| T6 | Testing | Pass | Bundle budgets in `apps/web` (1mb/2mb) and `apps/demo` (500kb). |
| T7 | Testing | Fail | No Dependabot or Renovate configured. |
| T10 | Testing | Pass | CI: two parallel jobs (`lint-and-build`, `web-e2e`). |
| U2 | UX | Pass | `@spartan-ng/brain` headless primitives for dialogs, selects, dropdowns. |
| U7 | UX | Pass | Confirmation dialogs for delete, remove, revoke, cancel subscription. |
| U9 | UX | Pass | oklch design tokens in CSS variables consumed via Tailwind theme. |
| D1 | Docs | Pass | `AGENTS.md` at repo root with commands, layout, rules. |
| D2 | Docs | Pass | ADRs: `0001-supabase-tenant-rls.md`, `0002-billing-multi-provider.md`. |
| D4 | Docs | Fail | No `CONTRIBUTING.md` or `SECURITY.md`. |
| D7 | Docs | Fail | No PR template. |

## SaaS domain

| ID | Criterion | Result | Notes |
|----|-----------|--------|-------|
| SaaS1 | Multi-tenant context | **Pass** | Org switcher in shell; workspace isolation; E2E tested. |
| SaaS2 | Tenant scope in navigation | **Partial** | Active-org model (`workspaceContextGuard`), not URL `:orgSlug` route params. |
| SaaS3 | Billing via port | **Pass** | `BillingPort` / `BILLING_PORT` with mock and Supabase adapters. |
| SaaS4 | Seat limit UX | **Pass** | `inviteSeatsExhausted` computed; paywall dialog; E2E coverage. |
| SaaS5 | Onboarding flow | **Pass** | Activation checklist with E2E (register -> create workspace -> activate). |
| SaaS6 | Members lifecycle | **Partial** | Invite/remove/change-role UI + dialogs; E2E covers invite + remove; no role-change E2E. |
| SaaS7 | RBAC in UI | **Partial** | `workspaceAdminGuard` for settings routes; owner-protected actions. Guard-based, not comprehensive feature-level hiding. |

## Demo vs production

| Topic | Demo behavior | Production target |
|-------|---------------|-------------------|
| Auth tokens | Supabase `localStorage` JWT | HttpOnly cookies / BFF pattern |
| CSP | `<meta>` tag with `unsafe-inline` | Strict CSP via HTTP headers + nonces |
| CSRF | Not configured | `withXsrfConfiguration` for cookie-based API |
| Adapters | Mock-only (`provideDemoAdapters`) | Production Supabase adapters wired |
| Billing | Mock adapter (default) or Stripe | Stripe with production webhook URL |

## CI evidence

- Lint: `npx nx run-many -t lint --all` in CI (`lint-and-build` job)
- Test: `npx nx run-many -t test --projects=ports` in CI
- E2E: `npx playwright test --grep @web` in CI (`web-e2e` job, Supabase + Playwright)
- Build: `npx nx build web` and `npx nx build demo` in CI

## Badge

Score-based badge (Must gates for L1 not yet met):

```markdown
[![Quality: 721/1000](https://img.shields.io/badge/Quality_Framework-721%2F1000-0ea5e9)](./docs/QUALITY.md)
```

## L1 blockers

To claim **L1 Starter-ready**, close these Must-level gaps:

| Blocker | Criteria | Effort |
|---------|----------|--------|
| Move `InjectionToken` + `Observable` out of `libs/ports` | A1 | Medium — extract DI tokens to a separate `libs/ports-ng` or inline in adapters |
| Strict CSP via HTTP headers | S1 | Low — deploy config, not code |
| HttpOnly token storage (production) | S5 | Medium — BFF or Supabase SSR adapter |
| CSRF configuration | S6 | Low — `withXsrfConfiguration` when using cookie auth |
| Auth interceptor | S7 | Low — centralize via `withInterceptors` |
| Replace remaining `subscribe` with `toSignal` | NG6 | Low — 8 call sites |
| Typed `FormGroup<T>` interfaces | NG7 | Low — add explicit type parameters |

## Next actions

1. Add `CONTRIBUTING.md` and `SECURITY.md` (D4)
2. Add PR template `.github/pull_request_template.md` (D7)
3. Configure Dependabot or Renovate (T7)
4. Add `provideZonelessChangeDetection()` (NG2)
5. Close L1 Must-gate blockers above
6. Re-assess and update score

Full rubric: [github.com/oequ/quality-framework/tree/main/docs/rubric](https://github.com/oequ/quality-framework/tree/main/docs/rubric)
