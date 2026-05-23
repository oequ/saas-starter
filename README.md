# Oequ SaaS Starter

**Angular B2B SaaS control plane** in one Nx monorepo: workspace shell, org settings, billing UI, metrics, API keys — wired through **ports** so you swap mock, Supabase, or HTTP without rewriting features.

| | **Demo** | **Web (full-stack)** |
|---|----------|----------------------|
| **Run** | `npx nx serve demo` → http://localhost:4200 | `npm run start:web` → http://localhost:4201 |
| **Backend** | All mock (`provideDemoAdapters`) | Auth + org: **Supabase**; billing, metrics, … still mock |
| **Needs** | `npm install` only | Docker + `npm run db:start` |
| **Ship target** | GitHub Pages, BYO API | Local/prod Supabase project |

Locked versions: [docs/STACK.md](./docs/STACK.md) · Backlog: [docs/ROADMAP.md](./docs/ROADMAP.md) · DB: [supabase/README.md](./supabase/README.md)

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

After sign-up, link your user to org `demo` once in [Studio SQL](http://127.0.0.1:54323) — steps in [supabase/README.md](./supabase/README.md).

---

## What's implemented today

Honest split — UI is largely shared; **adapters** decide what is real.

| Capability | Demo | Web |
|------------|------|-----|
| Auth (sign-in, register, session) | Mock | Supabase |
| Organizations / workspace switch | Mock | Supabase (read + RLS) |
| Members invite / org writes | Mock | Supabase RPC + RLS (`0002`) |
| Tenant isolation | N/A (mock) | RLS + `web-e2e` smoke |
| Billing, paywall, payment methods | Mock | Mock |
| Metrics, API keys, activation | Mock | Mock |
| i18n (English) | Yes | Yes |

**Architecture rule:** features depend on `@oequ/ports` tokens only — never `@supabase/supabase-js` in `libs/features-*` or `libs/shell`.

```text
apps/demo  ──► provideDemoAdapters()     ──► mock everything
apps/web   ──► provideWebAdapters()       ──► Supabase auth/org + mock rest

libs/features-* / libs/shell  →  AuthPort, OrgPort, BillingPort, …
libs/adapters-mock            →  demo + non-auth ports for web
libs/data-access-supabase     →  Supabase auth/org adapters
```

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
| [docs/ROADMAP.md](./docs/ROADMAP.md) | What to build next (P0 demo gaps vs Supabase phase 3) |
| [docs/STACK.md](./docs/STACK.md) | Version pins before `npm install` anything |
| [docs/I18N.md](./docs/I18N.md) | Adding locales |
| [docs/QUALITY.md](./docs/QUALITY.md) | [Quality Framework](https://github.com/oequ/quality-framework) self-assessment |
| [supabase/README.md](./supabase/README.md) | Docker, `db:*` scripts, member SQL |

**Live mock demo (Pages):** https://oequ.github.io/angular-saas-starter-ui/  
**Marketing:** https://oequ.github.io/saas-starter-landing/

---

## Scripts

| Command | Description |
|---------|-------------|
| `npx nx serve demo` | Mock demo (:4200) |
| `npm run start:web` | Supabase web (:4201) |
| `npm run db:start` / `db:reset` / `db:status` | Local Supabase stack |
| `npx nx build demo` | Production build + service worker |
| `npm run build:pages` | GitHub Pages (`baseHref` + PWA) |
| `npm run e2e` | Playwright |
| `UPDATE_SCREENSHOTS=1 npm run screenshots` | Regenerate `docs/assets/*.png` |
| `npx nx run-many -t lint --all` | Lint |

---

## Preview

Screenshots: [`docs/assets/`](./docs/assets/) · regenerate: `UPDATE_SCREENSHOTS=1 npm run screenshots`

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
