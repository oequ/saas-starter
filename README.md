# Oequ SaaS Starter

**Angular B2B SaaS control plane** in one Nx monorepo: workspace shell, org settings, billing UI, metrics, API keys — wired through **ports** so you swap mock, Supabase, or HTTP without rewriting features.

| | **Demo** | **Web (full-stack)** |
|---|----------|----------------------|
| **Run** | `npx nx serve demo` → http://localhost:4200 | `npm run start:web` → http://localhost:4201 |
| **Backend** | All mock (`provideDemoAdapters`) | Auth, org, metrics, API keys, emails: **Supabase**; billing **mock** (default) or **Stripe** |
| **Needs** | `npm install` only | Docker + `npm run db:start` |
| **Ship target** | GitHub Pages, BYO API | Local/prod Supabase project |

Locked versions: [docs/STACK.md](./docs/STACK.md) · DB: [supabase/README.md](./supabase/README.md)

---

## Start here

### Demo (no database)

```bash
npm install
npx nx serve demo
```

Sign in: `demo@example.com` / `OequDemo2026!` (pre-filled on login; see `@oequ/ports`).

### Full-stack (Supabase local)

```bash
npm install
npm run db:start      # first time: Docker pulls images (see supabase/README.md)
npm run db:reset
```

Copy `apps/web/src/app/supabase.settings.example.ts` → `supabase.settings.ts` and paste **Publishable** key from `npm run db:status`.

```bash
npm run start:web
```

After sign-up you can **create a workspace** in the app, or link your user to org `demo` in [Studio SQL](http://127.0.0.1:54323) — [supabase/README.md](./supabase/README.md).

### Pre-release check (web + Supabase)

Playwright smoke for auth, onboarding, tenant isolation (`@web` tag):

```bash
npm run pre-release:web
```

API Developer Console (public API + Playwright `@api-console`):

```bash
npm run pre-release:api-console
```

Or manually (Supabase already running):

```bash
npm run e2e:web:release
```

---

## What's implemented today

Honest split — UI is largely shared; **adapters** decide what is real.

| Capability | Demo | Web |
|------------|------|-----|
| Auth (sign-in, register, session) | Mock | Supabase |
| Organizations / workspace switch | Mock | Supabase (read + RLS) |
| Members invite / org writes | Mock (seat cap in adapter) | Supabase RPC + RLS; Postgres enforces `seats_limit` (`0007`) |
| Billing plan → seat cap | Mock only | Mock (`0008`) or provider webhooks (`0013`) update Postgres `seats_limit` |
| Tenant isolation + invite claim | N/A (mock) | RLS + `web-e2e` (`@web` smoke) |
| Billing, paywall, cancel, invoices | Mock | `billingProvider`: `mock` (default), `stripe`, or `custom` — Team per-seat sync on invite/remove — [STRIPE_LOCAL.md](docs/STRIPE_LOCAL.md), [BILLING_CUSTOM_PROVIDER.md](docs/BILLING_CUSTOM_PROVIDER.md) |
| Metrics, API keys, emails, activation | Mock | Supabase (`0010`–`0012`) + adapters; mock integrations/support |
| Public API (`public-v1`) + usage units | N/A | Edge + migrations `0028`–`0032`; smoke `test:demo-runs-http` |
| API Developer Console (`apps/api-console`) | N/A | Supabase auth + keys + playground; `:4202`, `pre-release:api-console` |
| i18n (English) | Yes | Yes |

**Architecture rule:** features depend on `@oequ/ports` tokens only — never `@supabase/supabase-js` in `libs/features-*` or `libs/shell`.

```text
apps/demo  ──► provideDemoAdapters()     ──► mock everything
apps/web   ──► provideWebAdapters()       ──► Supabase auth/org/metrics/keys/emails/activation + mock integrations

libs/features-* / libs/shell  →  AuthPort, OrgPort, BillingPort, …
libs/adapters-mock            →  demo + non-auth ports for web
libs/data-access-supabase     →  Supabase auth/org adapters
```

---

## Starter-ready vs production

**Ready as a starter** — clone, `npm run db:reset`, `npm run start:web` or `pre-release:web`: multi-tenant app with mock billing in CI and optional Stripe (Checkout, Portal, Team per-seat bump on invite, decrease on remove).

**Not production out of the box** without operator setup:

| Gap | What you do |
|-----|-------------|
| **Prod deploy** | Hosted Supabase, Edge secrets (`STRIPE_*`), production webhook URL, web env — [DEPLOY.md](docs/DEPLOY.md) |
| **Stripe in PR CI** | `e2e:web:release` uses mock only |
| **Stripe nightly CI** | API smoke workflow (webhook + seat bump) — [STRIPE_LOCAL.md](docs/STRIPE_LOCAL.md#cie2e); needs GitHub secrets |
| **Stripe UI smoke** | Manual on your machine: Checkout + Members — [STRIPE_LOCAL.md](docs/STRIPE_LOCAL.md) |
| **`apps/demo`** | Mock-first; not full parity with `apps/web` |
| **Embedded Checkout** | Hosted redirect only (Elements later) |

---

## Stack

- **Angular 21** · **Nx 22** · Spartan (`@spartan-ng/brain`) · **Tailwind v4**
- **Transloco** (`@oequ/i18n`) — UI copy and port errors are keys, not hardcoded strings
- **Supabase** — CLI `~2.101.0` (devDep), client `~2.106.1`, Postgres via `supabase db reset`

---

## Monorepo layout

```text
apps/demo                 # Mock demo · GitHub Pages · PWA (production builds)
apps/web                  # Full-stack shell (same routes as demo)
apps/demo-e2e             # Playwright + README screenshots
libs/ports                # AuthPort, OrgPort, BillingPort, …
libs/data-access-supabase # Supabase adapters + provideWebAdapters()
libs/adapters-mock        # Mock adapters + provideDemoAdapters()
libs/shell                # Layout, guards, paywall, help panel
libs/features-auth        # Login, register, account
libs/features-org         # Workspace, settings, metrics, API keys
libs/i18n                 # Transloco assets and locale preference
libs/ui                   # Spartan helm (@spartan-ng/helm/*)
supabase/                 # Migrations, seed, local CLI config
```

---

## Docs

| Doc | Use when |
|-----|----------|
| [docs/STRIPE_LOCAL.md](./docs/STRIPE_LOCAL.md) | Local Stripe + Edge Functions smoke |
| [docs/PUBLIC_API.md](./docs/PUBLIC_API.md) | OSS public REST API (keys, demo-runs, local smoke) |
| [apps/api-console/README.md](./apps/api-console/README.md) | API Developer Console (local :4202) |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Hosted Supabase + Vercel launch runbook |
| [docs/BILLING_CUSTOM_PROVIDER.md](./docs/BILLING_CUSTOM_PROVIDER.md) | Custom billing provider integration |
| [docs/STACK.md](./docs/STACK.md) | Version pins before `npm install` anything |
| [docs/I18N.md](./docs/I18N.md) | Adding locales |
| [docs/adr/](./docs/adr/) | Architecture decision records |
| [supabase/README.md](./supabase/README.md) | Docker, `db:*` scripts, member SQL |

**Live mock demo (Pages):** https://oequ.github.io/angular-saas-starter-ui/  
**Marketing:** https://oequ.github.io/saas-starter-landing/

---

## Scripts

| Command | Description |
|---------|-------------|
| `npx nx serve demo` | Mock demo (:4200) |
| `npm run start:web` | Supabase web (:4201) |
| `npm run start:api-console` | OSS API Developer Console (:4202) |
| `npm run db:start` / `db:reset` / `db:status` | Local Supabase stack |
| `npx nx build demo` | Production build + service worker |
| `npm run build:pages` | GitHub Pages (`baseHref` + PWA) |
| `npm run e2e` | Playwright (demo) |
| `npm run e2e:web:release` | Playwright smoke for `apps/web` (`@web`, needs Supabase) |
| `npm run pre-release:web` | `db:start` + `db:reset` + `e2e:web:release` |
| `npm run production:check` | Hosted Supabase pre-flight (migrations, Edge Functions, keys) |
| `npm run test:demo-runs-http` | Public API smoke (needs `db:reset` + `functions:serve`) |
| `UPDATE_SCREENSHOTS=1 npm run screenshots` | Regenerate `docs/assets/*.png` |
| `npx nx run-many -t lint --all` | Lint |

---

## Preview

Screenshots: [`docs/assets/`](./docs/assets/) · regenerate: `UPDATE_SCREENSHOTS=1 npm run screenshots`

### API Developer Console

<video src="docs/assets/api-console-showcase.mp4" autoplay loop muted playsinline></video>

| Area | Notes |
|------|--------|
| Onboarding | Pluggable `ActivationPort` — demo: send first email |
| Metrics | Chart.js dashboard (mock `MetricsPort`) |
| API keys & members | List + filters + dialogs (mock) |
| Settings | Outline cards, workspace icon, danger zone |
| Billing | Plans, invoices, in-app cards (Stripe test numbers in mock) |
| Paywall | Stacked upgrade/downgrade dialogs |
| Cookie consent | Reject / accept / manage — `localStorage` |
| Help panel | Route-aware topics + support form |

---

## i18n

English ships today; infrastructure is ready for more locales — [docs/I18N.md](./docs/I18N.md). New UI text should be Transloco keys under `libs/i18n/src/assets/i18n/`.

---

## PWA (demo only)

Service worker and manifest apply to **`demo`** production / Pages builds, not `nx serve`. See `apps/demo/ngsw-config.json`, `apps/demo/public/manifest.webmanifest`.

---

## Workspace activation

After creating a workspace, activation gates `/workspace` until complete (demo: first email). Configure via `ACTIVATION_ONBOARDING_CONFIG` + `ActivationPort`; demo copy in `apps/demo/src/app/demo-activation.config.ts`.

---

## License

MIT — [LICENSE](./LICENSE).
